import { listAccounts } from "../../accounts/account.service.js";
import { generateAiAnalysis } from "../../ai/ai.service.js";
import { aiAnalyzeRequestSchema } from "../../ai/ai.schema.js";
import { listBudgets } from "../../budgets/budget.service.js";
import { listGoals } from "../../goals/goal.service.js";
import { getFinancialInsights } from "../../insights/insight.service.js";
import { getReportOverview } from "../../reports/report.service.js";
import { executeWhatsAppCommand } from "../commands/command.service.js";
import type { WhatsAppCommandResult } from "../commands/command.types.js";
import type { IntentResult } from "../intents/intent.types.js";
import {
  WHATSAPP_AI_ERROR_MESSAGE,
  WHATSAPP_QUERY_ERROR_MESSAGE,
} from "../responses/response.constants.js";
import {
  formatAiAnalysisResponse,
  formatBalanceResponse,
  formatBudgetsResponse,
  formatExpensesResponse,
  formatGoalsResponse,
  formatInsightsResponse,
} from "../responses/response.formatter.js";
import {
  resolveCurrentBudgetPeriod,
  resolveReportQuery,
} from "./period-query.js";

type AccountsLoader = typeof listAccounts;
type ReportLoader = typeof getReportOverview;
type BudgetsLoader = typeof listBudgets;
type GoalsLoader = typeof listGoals;
type InsightsLoader = typeof getFinancialInsights;
type AiAnalysisRunner = typeof generateAiAnalysis;
type CommandExecutor = typeof executeWhatsAppCommand;

interface WhatsAppQueryDependencies {
  accountsLoader?: AccountsLoader;
  reportLoader?: ReportLoader;
  budgetsLoader?: BudgetsLoader;
  goalsLoader?: GoalsLoader;
  insightsLoader?: InsightsLoader;
  aiAnalysisRunner?: AiAnalysisRunner;
  commandExecutor?: CommandExecutor;
  errorReporter?: (event: {
    intent: IntentResult["intent"];
    errorName: string;
  }) => void;
}

export interface WhatsAppQueryInput {
  userId: string;
  interpretation: IntentResult;
  referenceDate: Date;
}

export class WhatsAppQueryService {
  private readonly accountsLoader: AccountsLoader;
  private readonly reportLoader: ReportLoader;
  private readonly budgetsLoader: BudgetsLoader;
  private readonly goalsLoader: GoalsLoader;
  private readonly insightsLoader: InsightsLoader;
  private readonly aiAnalysisRunner: AiAnalysisRunner;
  private readonly commandExecutor: CommandExecutor;
  private readonly errorReporter: NonNullable<
    WhatsAppQueryDependencies["errorReporter"]
  >;

  constructor(dependencies: WhatsAppQueryDependencies = {}) {
    this.accountsLoader =
      dependencies.accountsLoader ?? listAccounts;
    this.reportLoader =
      dependencies.reportLoader ?? getReportOverview;
    this.budgetsLoader =
      dependencies.budgetsLoader ?? listBudgets;
    this.goalsLoader =
      dependencies.goalsLoader ?? listGoals;
    this.insightsLoader =
      dependencies.insightsLoader ?? getFinancialInsights;
    this.aiAnalysisRunner =
      dependencies.aiAnalysisRunner ?? generateAiAnalysis;
    this.commandExecutor =
      dependencies.commandExecutor ?? executeWhatsAppCommand;
    this.errorReporter =
      dependencies.errorReporter ?? reportQueryError;
  }

  async execute(
    input: WhatsAppQueryInput,
  ): Promise<WhatsAppCommandResult> {
    try {
      return await this.dispatch(input);
    } catch (error) {
      this.errorReporter({
        intent: input.interpretation.intent,
        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",
      });

      if (input.interpretation.intent === "ASK_FINANCE_AI") {
        return {
          code: "AI_ERROR",
          message: WHATSAPP_AI_ERROR_MESSAGE,
        };
      }

      return {
        code: "QUERY_ERROR",
        message: WHATSAPP_QUERY_ERROR_MESSAGE,
      };
    }
  }

  private async dispatch({
    userId,
    interpretation,
    referenceDate,
  }: WhatsAppQueryInput): Promise<WhatsAppCommandResult> {
    switch (interpretation.intent) {
      case "GET_BALANCE": {
        const accounts = await this.accountsLoader({ userId });

        return {
          code: "QUERY_RESULT",
          message: formatBalanceResponse(accounts),
        };
      }

      case "GET_EXPENSES": {
        const query = resolveReportQuery(
          interpretation.entities.periodHint,
          referenceDate,
        );
        const report = await this.reportLoader({
          userId,
          query: {
            ...query,
            type: "EXPENSE",
          },
        });

        return {
          code: "QUERY_RESULT",
          message: formatExpensesResponse(
            report,
            interpretation.entities.periodHint,
          ),
        };
      }

      case "GET_BUDGETS": {
        const budgets = await this.budgetsLoader({
          userId,
          query: resolveCurrentBudgetPeriod(referenceDate),
        });

        return {
          code: "QUERY_RESULT",
          message: formatBudgetsResponse(budgets),
        };
      }

      case "GET_GOALS": {
        const goals = await this.goalsLoader({
          userId,
          query: {
            status: "ACTIVE",
          },
        });

        return {
          code: "QUERY_RESULT",
          message: formatGoalsResponse(goals),
        };
      }

      case "GET_INSIGHTS": {
        const query = resolveReportQuery(
          interpretation.entities.periodHint,
          referenceDate,
        );
        const overview = await this.insightsLoader({
          userId,
          query,
        });

        return {
          code: "QUERY_RESULT",
          message: formatInsightsResponse(overview.insights),
        };
      }

      case "ASK_FINANCE_AI": {
        const request = aiAnalyzeRequestSchema.parse({
          filters: resolveReportQuery(
            interpretation.entities.periodHint,
            referenceDate,
          ),
          question: interpretation.rawText,
        });
        const result = await this.aiAnalysisRunner({
          userId,
          input: request,
        });

        return {
          code: "AI_ANALYSIS",
          message: formatAiAnalysisResponse(result),
        };
      }

      case "CREATE_EXPENSE":
      case "CREATE_INCOME":
      case "CONFIRM":
      case "CANCEL":
      case "HELP":
      case "UNKNOWN":
        return this.commandExecutor({
          userId,
          interpretation,
          now: referenceDate,
        });
    }
  }
}

function reportQueryError(event: {
  intent: IntentResult["intent"];
  errorName: string;
}) {
  console.error("[whatsapp] query_failed", event);
}
