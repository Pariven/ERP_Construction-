"use client";

import { useRef } from "react";

export function ProjectImageUpload({ action }: { action: (formData: FormData) => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <label className="cursor-pointer text-xs text-cat-1 hover:underline">
        Change photo
        <input
          type="file"
          name="image"
          accept="image/*"
          className="hidden"
          onChange={() => formRef.current?.requestSubmit()}
        />
      </label>
    </form>
  );
}
