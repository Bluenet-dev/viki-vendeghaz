import { startTransition, type FormEvent } from "react";

// A React 19 a `<form action={…}>` beküldése után automatikusan kiüríti az
// űrlapot – hiba esetén is, így a kezelőnek mindent újra kellene gépelnie.
// onSubmit-tal küldve az űrlap megtartja a beírt értékeket.
export function submitKeepingValues(dispatch: (formData: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };
}
