import { prisma } from "../../lib/prisma.js";

import type {
  CreateGoalContributionInput,
  CreateGoalInput,
  ListGoalsQuery,
  UpdateGoalInput,
} from "./goal.schema.js";

export class GoalNotFoundError extends Error {
  constructor() {
    super("Meta não encontrada.");
    this.name = "GoalNotFoundError";
  }
}

export class GoalContributionNotFoundError extends Error {
  constructor() {
    super("Contribuição não encontrada.");
    this.name = "GoalContributionNotFoundError";
  }
}

export class InvalidGoalStatusError extends Error {
  constructor() {
    super(
      "A meta só pode ser concluída quando o valor acumulado atingir o objetivo.",
    );
    this.name = "InvalidGoalStatusError";
  }
}

export class GoalContributionNotAllowedError extends Error {
  constructor() {
    super(
      "Reative a meta antes de adicionar uma contribuição.",
    );
    this.name = "GoalContributionNotAllowedError";
  }
}

type GoalStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "PAUSED"
  | "CANCELLED";

interface CreateGoalParams {
  userId: string;
  input: CreateGoalInput;
}

export async function createGoal({
  userId,
  input,
}: CreateGoalParams) {
  const status = resolveGoalStatus({
    currentAmount: input.initialAmount,
    targetAmount: input.targetAmount,
    requestedStatus: input.status,
  });

  const goal = await prisma.goal.create({
    data: {
      userId,
      name: input.name,
      description: input.description || null,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate ?? null,
      status,
      icon: input.icon || null,
      color: input.color || null,
      contributions:
        input.initialAmount > 0
          ? {
              create: {
                userId,
                amount: input.initialAmount,
                date: new Date(),
                notes: "Valor inicial da meta",
              },
            }
          : undefined,
    },
    select: {
      id: true,
    },
  });

  return getGoal({
    userId,
    goalId: goal.id,
  });
}

interface ListGoalsParams {
  userId: string;
  query: ListGoalsQuery;
}

export async function listGoals({
  userId,
  query,
}: ListGoalsParams) {
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: query.status,
      OR: query.search
        ? [
            {
              name: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ]
        : undefined,
    },
    select: goalSelect,
    orderBy: [
      {
        status: "asc",
      },
      {
        targetDate: {
          sort: "asc",
          nulls: "last",
        },
      },
      {
        createdAt: "desc",
      },
    ],
  });

  if (goals.length === 0) {
    return [];
  }

  const totals =
    await prisma.goalContribution.groupBy({
      by: ["goalId"],
      where: {
        userId,
        goalId: {
          in: goals.map((goal) => goal.id),
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    });

  const totalsByGoal = new Map(
    totals.map((total) => [
      total.goalId,
      {
        currentAmount:
          total._sum.amount?.toNumber() ?? 0,
        contributionsCount: total._count._all,
      },
    ]),
  );

  return goals.map((goal) => {
    const total = totalsByGoal.get(goal.id);

    return serializeGoal(
      goal,
      total?.currentAmount ?? 0,
      total?.contributionsCount ?? 0,
    );
  });
}

interface GetGoalParams {
  userId: string;
  goalId: string;
}

export async function getGoal({
  userId,
  goalId,
}: GetGoalParams) {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    select: {
      ...goalSelect,
      contributions: {
        select: contributionSelect,
        orderBy: [
          {
            date: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      },
    },
  });

  if (!goal) {
    throw new GoalNotFoundError();
  }

  const currentAmount = roundMoney(
    goal.contributions.reduce(
      (total, contribution) =>
        total + contribution.amount.toNumber(),
      0,
    ),
  );

  return {
    ...serializeGoal(
      goal,
      currentAmount,
      goal.contributions.length,
    ),
    contributions: goal.contributions.map(
      serializeContribution,
    ),
  };
}

interface UpdateGoalParams {
  userId: string;
  goalId: string;
  input: UpdateGoalInput;
}

export async function updateGoal({
  userId,
  goalId,
  input,
}: UpdateGoalParams) {
  const existingGoal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    select: {
      id: true,
      targetAmount: true,
      status: true,
    },
  });

  if (!existingGoal) {
    throw new GoalNotFoundError();
  }

  const total =
    await prisma.goalContribution.aggregate({
      where: {
        goalId: existingGoal.id,
        userId,
      },
      _sum: {
        amount: true,
      },
    });

  const currentAmount =
    total._sum.amount?.toNumber() ?? 0;

  const targetAmount =
    input.targetAmount ??
    existingGoal.targetAmount.toNumber();

  const status = resolveGoalStatus({
    currentAmount,
    targetAmount,
    requestedStatus:
      input.status ?? existingGoal.status,
  });

  await prisma.goal.update({
    where: {
      id: existingGoal.id,
    },
    data: {
      name: input.name,
      description:
        input.description === undefined
          ? undefined
          : input.description || null,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate,
      status,
      icon:
        input.icon === undefined
          ? undefined
          : input.icon || null,
      color:
        input.color === undefined
          ? undefined
          : input.color || null,
    },
  });

  return getGoal({
    userId,
    goalId: existingGoal.id,
  });
}

interface DeleteGoalParams {
  userId: string;
  goalId: string;
}

export async function deleteGoal({
  userId,
  goalId,
}: DeleteGoalParams) {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!goal) {
    throw new GoalNotFoundError();
  }

  await prisma.goal.delete({
    where: {
      id: goal.id,
    },
  });
}

interface ListGoalContributionsParams {
  userId: string;
  goalId: string;
}

export async function listGoalContributions({
  userId,
  goalId,
}: ListGoalContributionsParams) {
  await ensureGoalOwnership(userId, goalId);

  const contributions =
    await prisma.goalContribution.findMany({
      where: {
        goalId,
        userId,
      },
      select: contributionSelect,
      orderBy: [
        {
          date: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

  return contributions.map(
    serializeContribution,
  );
}

interface AddGoalContributionParams {
  userId: string;
  goalId: string;
  input: CreateGoalContributionInput;
}

export async function addGoalContribution({
  userId,
  goalId,
  input,
}: AddGoalContributionParams) {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    select: {
      id: true,
      status: true,
      targetAmount: true,
    },
  });

  if (!goal) {
    throw new GoalNotFoundError();
  }

  if (
    goal.status === "PAUSED" ||
    goal.status === "CANCELLED"
  ) {
    throw new GoalContributionNotAllowedError();
  }

  const contribution =
    await prisma.goalContribution.create({
      data: {
        userId,
        goalId: goal.id,
        amount: input.amount,
        date: input.date ?? new Date(),
        notes: input.notes || null,
      },
      select: contributionSelect,
    });

  await synchronizeCompletionStatus({
    userId,
    goalId: goal.id,
    targetAmount: goal.targetAmount.toNumber(),
    currentStatus: goal.status,
  });

  return {
    contribution:
      serializeContribution(contribution),
    goal: await getGoal({
      userId,
      goalId: goal.id,
    }),
  };
}

interface DeleteGoalContributionParams {
  userId: string;
  goalId: string;
  contributionId: string;
}

export async function deleteGoalContribution({
  userId,
  goalId,
  contributionId,
}: DeleteGoalContributionParams) {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    select: {
      id: true,
      status: true,
      targetAmount: true,
    },
  });

  if (!goal) {
    throw new GoalNotFoundError();
  }

  const contribution =
    await prisma.goalContribution.findFirst({
      where: {
        id: contributionId,
        goalId: goal.id,
        userId,
      },
      select: {
        id: true,
      },
    });

  if (!contribution) {
    throw new GoalContributionNotFoundError();
  }

  await prisma.goalContribution.delete({
    where: {
      id: contribution.id,
    },
  });

  await synchronizeCompletionStatus({
    userId,
    goalId: goal.id,
    targetAmount: goal.targetAmount.toNumber(),
    currentStatus: goal.status,
  });
}

async function ensureGoalOwnership(
  userId: string,
  goalId: string,
) {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!goal) {
    throw new GoalNotFoundError();
  }
}

async function synchronizeCompletionStatus({
  userId,
  goalId,
  targetAmount,
  currentStatus,
}: {
  userId: string;
  goalId: string;
  targetAmount: number;
  currentStatus: GoalStatus;
}) {
  if (
    currentStatus === "PAUSED" ||
    currentStatus === "CANCELLED"
  ) {
    return;
  }

  const total =
    await prisma.goalContribution.aggregate({
      where: {
        goalId,
        userId,
      },
      _sum: {
        amount: true,
      },
    });

  const currentAmount =
    total._sum.amount?.toNumber() ?? 0;

  const nextStatus =
    currentAmount >= targetAmount
      ? "COMPLETED"
      : "ACTIVE";

  if (nextStatus === currentStatus) {
    return;
  }

  await prisma.goal.update({
    where: {
      id: goalId,
    },
    data: {
      status: nextStatus,
    },
  });
}

function resolveGoalStatus({
  currentAmount,
  targetAmount,
  requestedStatus,
}: {
  currentAmount: number;
  targetAmount: number;
  requestedStatus: GoalStatus;
}): GoalStatus {
  if (
    requestedStatus === "COMPLETED" &&
    currentAmount < targetAmount
  ) {
    throw new InvalidGoalStatusError();
  }

  if (
    requestedStatus === "PAUSED" ||
    requestedStatus === "CANCELLED"
  ) {
    return requestedStatus;
  }

  return currentAmount >= targetAmount
    ? "COMPLETED"
    : "ACTIVE";
}

const goalSelect = {
  id: true,
  name: true,
  description: true,
  targetAmount: true,
  targetDate: true,
  status: true,
  icon: true,
  color: true,
  createdAt: true,
  updatedAt: true,
} as const;

const contributionSelect = {
  id: true,
  amount: true,
  date: true,
  notes: true,
  createdAt: true,
} as const;

interface DecimalValue {
  toNumber(): number;
}

interface SerializableGoal {
  id: string;
  name: string;
  description: string | null;
  targetAmount: DecimalValue;
  targetDate: Date | null;
  status: GoalStatus;
  icon: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SerializableContribution {
  id: string;
  amount: DecimalValue;
  date: Date;
  notes: string | null;
  createdAt: Date;
}

function serializeGoal(
  goal: SerializableGoal,
  currentAmountValue: number,
  contributionsCount: number,
) {
  const targetAmount =
    goal.targetAmount.toNumber();

  const currentAmount = roundMoney(
    currentAmountValue,
  );

  const remainingAmount = roundMoney(
    targetAmount - currentAmount,
  );

  const percentageCompleted =
    roundPercentage(
      (currentAmount / targetAmount) * 100,
    );

  const completed =
    currentAmount >= targetAmount;

  const deadline = calculateDeadline(
    goal.targetDate,
    completed,
    goal.status,
  );

  return {
    id: goal.id,
    name: goal.name,
    description: goal.description,
    targetAmount,
    currentAmount,
    remainingAmount,
    percentageCompleted,
    completed,
    targetDate: goal.targetDate,
    daysRemaining: deadline.daysRemaining,
    overdue: deadline.overdue,
    status: goal.status,
    icon: goal.icon,
    color: goal.color,
    contributionsCount,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

function serializeContribution(
  contribution: SerializableContribution,
) {
  return {
    id: contribution.id,
    amount: contribution.amount.toNumber(),
    date: contribution.date,
    notes: contribution.notes,
    createdAt: contribution.createdAt,
  };
}

function calculateDeadline(
  targetDate: Date | null,
  completed: boolean,
  status: GoalStatus,
) {
  if (!targetDate) {
    return {
      daysRemaining: null,
      overdue: false,
    };
  }

  const today = new Date();
  const todayStart = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  const targetStart = Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
  );

  const differenceInDays = Math.ceil(
    (targetStart - todayStart) /
      (24 * 60 * 60 * 1000),
  );

  return {
    daysRemaining: Math.max(
      0,
      differenceInDays,
    ),
    overdue:
      differenceInDays < 0 &&
      !completed &&
      status === "ACTIVE",
  };
}

function roundMoney(value: number) {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}

function roundPercentage(value: number) {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}
