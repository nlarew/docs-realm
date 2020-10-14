import React from "react";
import { useQuery } from "@apollo/client";
import gql from "graphql-tag";
import useTaskMutations from "./useTaskMutations";
import { useRealmApp } from "../RealmApp";

const useTasks = (project) => {
  const { tasks, loading } = useAllTasksInProject(project);
  const { addTask, updateTask } = useTaskMutations(project);
  return {
    loading,
    tasks,
    updateTask,
    addTask,
  };
};
export default useTasks;

function useAllTasksInProject(project) {
  const { data, loading, error, refetch } = useQuery(
    gql`
      query GetAllTasksForProject($partition: String!) {
        tasks(query: { _partition: $partition }) {
          _id
          name
          status
        }
      }
    `,
    { variables: { partition: project.partition } }
  );
  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }
  
  useWatchCollection({
    db: "tracker",
    collection: "Task",
    onChange: refetch
  });
  
  // If the query has finished, return the tasks from the result data
  // Otherwise, return an empty list
  const tasks = data?.tasks ?? [];
  
  return { tasks, loading };
}

function useCollection({ cluster="mongodb-atlas", db, collection }) {
  const { currentUser } = useRealmApp();
  return React.useMemo(() => {
    return currentUser
      .mongoClient(cluster)
      .db(db)
      .collection(collection);
  }, [currentUser, cluster, db, collection]);
}

function useWatchCollection({ cluster="mongodb-atlas", db, collection, onChange }) {
  const coll = useCollection({ cluster, db, collection });
  React.useEffect(() => {
    async function watch() {
      for await (const change of coll.watch()) {
        onChange(change);
      }
    }
    watch();
  }, [coll, onChange]);
}
