import { CloudTasksClient } from '@google-cloud/tasks';
import { google } from '@google-cloud/tasks/build/protos/protos';
import type { ClientOptions } from 'google-gax';

const project = process.env.GCP_PROJECT_ID || 'dota-dd5dd';
const location = 'us-central1';

const options: ClientOptions = {
  projectId: project,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
};

export const getPathQueue = (queueName: string): string => {
  const tasksClient: CloudTasksClient = new CloudTasksClient(options);
  return tasksClient.queuePath(project, location, queueName);
};

export const addToQueue = async (
  task: google.cloud.tasks.v2.ITask,
  queuePath: string,
) => {
  const tasksClient: CloudTasksClient = new CloudTasksClient(options);
  const qrequest: google.cloud.tasks.v2.ICreateTaskRequest = {
    parent: queuePath,
    task: task,
  };

  // Send create task request.
  const [response] = await tasksClient.createTask(qrequest);
  const name = response.name;
  console.log(`Created task ${name}`);
};
