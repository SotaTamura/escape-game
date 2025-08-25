import { type ReactNode } from "react";

export default function Checkbox({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label htmlFor={id}>
      <input type="checkbox" name={id} id={id} checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}
