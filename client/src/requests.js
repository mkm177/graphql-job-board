import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from 'apollo-boost';
import gql from 'graphql-tag';

import { getAccessToken, isLoggedIn } from './auth';

const endpointURL = 'http://localhost:9000/graphql';

const authLink = new ApolloLink((operation, forward) => {
	if (isLoggedIn()) {
		// request.headers['authorization'] = 'Bearer ' + getAccessToken();
		operation.setContext({
			headers: {
				authorization: 'Bearer ' + getAccessToken()
			}
		});
	}
	return forward(operation);
});

const client = new ApolloClient({
	link: ApolloLink.from([authLink, new HttpLink({ uri: endpointURL })]),
	cache: new InMemoryCache()
});

const jobDetailFragment = gql`
	fragment JobDetail on Job {
		id
		title
		company {
			id
			name
		}
		description
	}
`;

const createJobMutation = gql`
	mutation CreateJob($input: CreateJobInput) {
		job: createJob(input: $input) {
			...JobDetail
		}
	}
	${jobDetailFragment}
`;

const companyQuery = gql`
	query CompanyQuery($id: ID!) {
		company(id: $id) {
			id
			name
			description
			jobs {
				id
				title
			}
		}
	}
`;

const JobQuery = gql`
	query JobQuery($id: ID!) {
		job(id: $id) {
			...JobDetail
		}
	}
	${jobDetailFragment}
`;

const jobsQuery = gql`
	query JobsQuery {
		jobs {
			id
			title
			company {
				id
				name
			}
		}
	}
`;

export async function createJob(input) {
	const {
		data: { job }
	} = await client.mutate({
		mutation: createJobMutation,
		variables: { input },
		update: (cache, { data }) => {
			cache.writeQuery({
				query: JobQuery,
				variables: { id: data.job.id },
				data
			});
		}
	});
	return job;
}

export async function loadCompany(id) {
	const {
		data: { company }
	} = await client.query({ query: companyQuery, variables: { id } });
	return company;
}

export async function loadJobs() {
	const {
		data: { jobs }
	} = await client.query({ query: jobsQuery, fetchPolicy: 'no-cache' });
	return jobs;
}

export async function loadJob(id) {
	const {
		data: { job }
	} = await client.query({ query: JobQuery, variables: { id } });
	return job;
}
