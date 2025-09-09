import { CloudTasksClient } from '@google-cloud/tasks';
import { google } from '@google-cloud/tasks/build/protos/protos';
import type { ClientOptions } from 'google-gax';

import adminCredentials from '../firebase/firebaseConfigAdmin';

const options: ClientOptions = {
  projectId: adminCredentials.project_id,
  credentials: {
    client_email: adminCredentials.client_email,
    private_key: adminCredentials.private_key,
  },
};

const project = adminCredentials.project_id;
const location = 'us-central1';

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
