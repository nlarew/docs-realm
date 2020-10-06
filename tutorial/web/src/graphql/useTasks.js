import React from "react";
import { useQuery } from "@apollo/client";
import gql from "graphql-tag";
import useTaskMutations, { TaskFieldsFragment } from "./useTaskMutations";
import { useApolloClient } from "@apollo/client";
import { useRealmApp } from "../RealmApp";
import bson from "bson";

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
  const { data, loading, error, updateQuery, refetch } = useQuery(
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
  // const updateWithNewTask = (newTask) => {
  //   newTask._id = newTask._id.toString();
  //   updateQuery((prev) => {
  //     return {
  //       tasks: [...prev.tasks, newTask],
  //     };
  //   });
  // };
  // useWatchTasks(updateWithNewTask);
  useTaskChanges(change => {
    refetch();
  });
  useDelayedInsert(project);

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
  }, [currentUser]);
}

function useTaskChanges(onChange) {
  const tasks = useCollection({ db: "tracker", collection: "Task"});
  React.useEffect(() => {
    async function watchTasks() {
      for await (const change of tasks.watch()) {
        onChange(change);
      }
    }
    watchTasks();
  })
}

function useDelayedInsert(project) {
  const tasks = useCollection({ db: "tracker", collection: "Task"});
  React.useEffect(() => {
    async function insertDoodad() {
      const r = await tasks.insertOne({
        _id: new bson.ObjectId(),
        _partition: project.partition,
        name: `Hi from ${Date.now()}`,
        status: "Open",
      });
      console.log("result", r);
      return r;
    }
    setTimeout(() => {
      insertDoodad();
    }, 3000);
  }, []);
}
