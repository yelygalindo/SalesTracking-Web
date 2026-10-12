import { validateRequiredEmail } from "@/lib/validation/email";
import type { TrialSignupInput } from "../api/trialSignupApi";

export type TrialSignupForm = Omit<TrialSignupInput, "captchaToken">;
export type TrialSignupField = keyof TrialSignupForm;

export const emptyTrialSignup: TrialSignupForm = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  country: "",
  companyName: "",
  industry: "",
};

// Same rule as the API, so the form rejects what the server would reject.
const phonePattern = /^\+?[0-9][0-9\s\-()]{5,28}$/;
const required = (message: string) => (value: string) => (value.trim() ? null : message);

export const trialSignupValidators: Record<TrialSignupField, (value: string) => string | null> = {
  fullName: required("Ingresa tu nombre completo."),
  email: validateRequiredEmail,
  phone: (value) =>
    phonePattern.test(value.trim())
      ? null
      : "Ingresa un teléfono válido, por ejemplo +591 70000000.",
  city: required("Ingresa tu ciudad."),
  country: required("Ingresa tu país."),
  companyName: required("Ingresa el nombre de tu empresa."),
  industry: required("Selecciona el rubro de tu empresa."),
};

export function invalidTrialSignupFields(form: TrialSignupForm) {
  return (Object.keys(trialSignupValidators) as TrialSignupField[]).filter((key) =>
    trialSignupValidators[key](form[key]),
  );
}

/** Mirrors the API password policy: 8+ characters with upper case, lower case and a digit. */
export function validateNewPassword(password: string) {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/\p{Lu}/u.test(password)) return "Incluye al menos una letra mayúscula.";
  if (!/\p{Ll}/u.test(password)) return "Incluye al menos una letra minúscula.";
  if (!/\d/.test(password)) return "Incluye al menos un número.";
  return null;
}

export function validatePasswordConfirmation(password: string, confirmation: string) {
  return confirmation === password ? null : "Las contraseñas no coinciden.";
}
