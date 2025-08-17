import React, { useState, type ReactNode } from "react";

export default function Checkbox({
  id,
  onChange,
  children,
}: {
  id: string;
  onChange: (e: React.ChangeEvent) => void;
  children: ReactNode;
}) {
  const [checked, setChecked] = useState(false);
  const HandleChange = (e: React.ChangeEvent) => {
    setChecked(!checked);
    onChange(e);
  };
  return (
    <label htmlFor={id}>
      <input
        type="checkbox"
        name={id}
        id={id}
        checked={checked}
        onChange={HandleChange}
      />
      {children}
    </label>
  );
}
