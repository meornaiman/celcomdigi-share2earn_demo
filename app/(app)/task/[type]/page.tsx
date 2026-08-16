import { TASK_ORDER, taskFromSlug, taskSlug } from "@/lib/tasks";
import { notFound } from "next/navigation";
import { TaskFlow } from "./task-flow";

/** The five supported tasks are known at build time, so each gets its own page. */
export function generateStaticParams() {
  return TASK_ORDER.map((type) => ({ type: taskSlug(type) }));
}

export default async function TaskPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const taskType = taskFromSlug(type);
  if (!taskType) notFound();
  return <TaskFlow taskType={taskType} />;
}
