import { createElement } from "react";
import {
  Banknote,
  BriefcaseBusiness,
  Car,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  House,
  Plane,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import type { CategoryType } from "../../lib/categories";

export interface CategoryIconOption {
  name: string;
  label: string;
  icon: LucideIcon;
}

export const categoryIconOptions: CategoryIconOption[] = [
  {
    name: "Utensils",
    label: "Alimentação",
    icon: Utensils,
  },
  {
    name: "House",
    label: "Moradia",
    icon: House,
  },
  {
    name: "Car",
    label: "Transporte",
    icon: Car,
  },
  {
    name: "HeartPulse",
    label: "Saúde",
    icon: HeartPulse,
  },
  {
    name: "ShoppingBag",
    label: "Compras",
    icon: ShoppingBag,
  },
  {
    name: "GraduationCap",
    label: "Educação",
    icon: GraduationCap,
  },
  {
    name: "Gamepad2",
    label: "Lazer",
    icon: Gamepad2,
  },
  {
    name: "Plane",
    label: "Viagem",
    icon: Plane,
  },
  {
    name: "Banknote",
    label: "Salário",
    icon: Banknote,
  },
  {
    name: "BriefcaseBusiness",
    label: "Trabalho",
    icon: BriefcaseBusiness,
  },
  {
    name: "TrendingUp",
    label: "Investimentos",
    icon: TrendingUp,
  },
  {
    name: "ReceiptText",
    label: "Outros",
    icon: ReceiptText,
  },
];

export function getDefaultCategoryIconName(
  type: CategoryType,
) {
  return type === "INCOME"
    ? "Banknote"
    : "ReceiptText";
}

export function getCategoryIcon(
  iconName: string | null,
  type: CategoryType,
): LucideIcon {
  const exactIcon = categoryIconOptions.find(
    (option) => option.name === iconName,
  );

  if (exactIcon) {
    return exactIcon.icon;
  }

  const normalizedIcon =
    iconName?.toLocaleLowerCase("en-US") ?? "";

  const aliases: Array<{
    terms: string[];
    icon: LucideIcon;
  }> = [
    {
      terms: ["utensil", "food", "meal"],
      icon: Utensils,
    },
    {
      terms: ["house", "home", "housing"],
      icon: House,
    },
    {
      terms: ["car", "transport"],
      icon: Car,
    },
    {
      terms: ["heart", "health", "medical"],
      icon: HeartPulse,
    },
    {
      terms: ["shopping", "cart", "purchase"],
      icon: ShoppingBag,
    },
    {
      terms: ["graduation", "education", "book"],
      icon: GraduationCap,
    },
    {
      terms: ["game", "leisure"],
      icon: Gamepad2,
    },
    {
      terms: ["plane", "travel"],
      icon: Plane,
    },
    {
      terms: ["banknote", "salary", "money", "dollar"],
      icon: Banknote,
    },
    {
      terms: ["briefcase", "work"],
      icon: BriefcaseBusiness,
    },
    {
      terms: ["trend", "investment", "chart"],
      icon: TrendingUp,
    },
  ];

  const alias = aliases.find(({ terms }) =>
    terms.some((term) => normalizedIcon.includes(term)),
  );

  if (alias) {
    return alias.icon;
  }

  return type === "INCOME"
    ? Banknote
    : ReceiptText;
}

export function CategoryIcon({
  iconName,
  type,
  className,
}: {
  iconName: string | null;
  type: CategoryType;
  className?: string;
}) {
  return createElement(
    getCategoryIcon(iconName, type),
    { className },
  );
}
