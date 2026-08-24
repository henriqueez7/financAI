import { api } from "./api";

export type GoalStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "PAUSED"
  | "CANCELLED";

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  percentageCompleted: number;
  completed: boolean;
  targetDate: string | null;
  daysRemaining: number | null;
  overdue: boolean;
  status: GoalStatus;
  icon: string | null;
  color: string | null;
  contributionsCount: number;
  contributions?: GoalContribution[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  name: string;
  description?: string | null;
  targetAmount: number;
  initialAmount?: number;
  targetDate?: string | null;
  status?: GoalStatus;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateGoalInput {
  name?: string;
  description?: string | null;
  targetAmount?: number;
  targetDate?: string | null;
  status?: GoalStatus;
  icon?: string | null;
  color?: string | null;
}

export interface ListGoalsFilters {
  status?: GoalStatus;
  search?: string;
}

export interface AddGoalContributionInput {
  amount: number;
  date?: string;
  notes?: string | null;
}

interface GoalsResponse {
  goals: Goal[];
}

interface GoalResponse {
  goal: Goal;
}

interface CreateGoalResponse {
  message: string;
  goal: Goal;
}

interface UpdateGoalResponse {
  message: string;
  goal: Goal;
}

interface ContributionsResponse {
  contributions: GoalContribution[];
}

interface AddContributionResponse {
  message: string;
  contribution: GoalContribution;
  goal: Goal;
}

export async function listGoals(
  filters: ListGoalsFilters = {},
) {
  const searchParams = new URLSearchParams();

  if (filters.status) {
    searchParams.set("status", filters.status);
  }

  if (filters.search?.trim()) {
    searchParams.set(
      "search",
      filters.search.trim(),
    );
  }

  const query = searchParams.toString();
  const response = await api<GoalsResponse>(
    `/goals${query ? `?${query}` : ""}`,
  );

  return response.goals;
}

export async function getGoal(id: string) {
  const response = await api<GoalResponse>(
    `/goals/${id}`,
  );

  return response.goal;
}

export async function createGoal(
  input: CreateGoalInput,
) {
  return api<CreateGoalResponse>("/goals", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateGoal(
  id: string,
  input: UpdateGoalInput,
) {
  return api<UpdateGoalResponse>(
    `/goals/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteGoal(id: string) {
  await api<void>(`/goals/${id}`, {
    method: "DELETE",
  });
}

export async function listGoalContributions(
  goalId: string,
) {
  const response =
    await api<ContributionsResponse>(
      `/goals/${goalId}/contributions`,
    );

  return response.contributions;
}

export async function addGoalContribution(
  goalId: string,
  input: AddGoalContributionInput,
) {
  return api<AddContributionResponse>(
    `/goals/${goalId}/contributions`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteGoalContribution(
  goalId: string,
  contributionId: string,
) {
  await api<void>(
    `/goals/${goalId}/contributions/${contributionId}`,
    {
      method: "DELETE",
    },
  );
}

export function formatGoalStatus(
  status: GoalStatus,
) {
  const labels: Record<GoalStatus, string> = {
    ACTIVE: "Ativa",
    COMPLETED: "Concluída",
    PAUSED: "Pausada",
    CANCELLED: "Cancelada",
  };

  return labels[status];
}

export function formatGoalDate(
  value: string,
) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
