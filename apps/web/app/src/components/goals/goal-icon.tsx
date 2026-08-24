import { createElement } from "react";
import {
  Banknote,
  Car,
  Gem,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  PiggyBank,
  Plane,
  ReceiptText,
  ShieldCheck,
  Target,
  type LucideIcon,
} from "lucide-react";

export interface GoalIconOption {
  name: string;
  label: string;
  icon: LucideIcon;
}

export const goalIconOptions: GoalIconOption[] = [
  {
    name: "Target",
    label: "Objetivo",
    icon: Target,
  },
  {
    name: "ShieldCheck",
    label: "Reserva",
    icon: ShieldCheck,
  },
  {
    name: "Plane",
    label: "Viagem",
    icon: Plane,
  },
  {
    name: "House",
    label: "Imóvel",
    icon: House,
  },
  {
    name: "Laptop",
    label: "Tecnologia",
    icon: Laptop,
  },
  {
    name: "GraduationCap",
    label: "Educação",
    icon: GraduationCap,
  },
  {
    name: "Car",
    label: "Veículo",
    icon: Car,
  },
  {
    name: "HeartPulse",
    label: "Saúde",
    icon: HeartPulse,
  },
  {
    name: "Landmark",
    label: "Patrimônio",
    icon: Landmark,
  },
  {
    name: "PiggyBank",
    label: "Poupança",
    icon: PiggyBank,
  },
  {
    name: "Banknote",
    label: "Dinheiro",
    icon: Banknote,
  },
  {
    name: "Gem",
    label: "Conquista",
    icon: Gem,
  },
];

export const goalColorOptions = [
  { value: "#0C7A4D", label: "Verde" },
  { value: "#14B8A6", label: "Turquesa" },
  { value: "#0EA5E9", label: "Azul claro" },
  { value: "#3B82F6", label: "Azul" },
  { value: "#6366F1", label: "Índigo" },
  { value: "#8B5CF6", label: "Violeta" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#F97316", label: "Laranja" },
  { value: "#EAB308", label: "Amarelo" },
  { value: "#64748B", label: "Cinza" },
];

export function getGoalIcon(
  iconName: string | null,
): LucideIcon {
  return (
    goalIconOptions.find(
      (option) => option.name === iconName,
    )?.icon ?? ReceiptText
  );
}

export function GoalIcon({
  iconName,
  className,
}: {
  iconName: string | null;
  className?: string;
}) {
  return createElement(getGoalIcon(iconName), {
    className,
  });
}
