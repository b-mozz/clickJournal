"use client";

import { useState } from "react";

type Status = "empty" | "ready" | "submitting" | "error";

type FormValues = {
  caption: string;
  photoBlobName: string;
  latitude: string;
  longitude: string;
};

const initialValues: FormValues = {
  caption: "",
  photoBlobName: "",
  latitude: "",
  longitude: "",
};

function isReady(values: FormValues) {
  return (
    values.caption.trim() !== "" &&
    values.photoBlobName.trim() !== "" &&
    values.latitude.trim() !== "" &&
    values.longitude.trim() !== "" &&
    Number.isFinite(Number(values.latitude)) &&
    Number.isFinite(Number(values.longitude))
  );
}

export default function CreatePostForm() {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<Status>("empty");
  const [error, setError] = useState<string | null>(null);

  function updateField(field: keyof FormValues, value: string) {
    const nextValues = { ...values, [field]: value };

    setValues(nextValues);
    setError(null);
    setStatus(isReady(nextValues) ? "ready" : "empty");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isReady(values)) {
      setError("Complete all fields with valid values.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const response = await fetch("/api/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption: values.caption.trim(),
          photoBlobName: values.photoBlobName.trim(),
          latitude: Number(values.latitude),
          longitude: Number(values.longitude),
          visibility: "PRIVATE",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error?.message ?? "Unable to create post.");
        setStatus("error");
        return;
      }

      setValues(initialValues);
      setStatus("empty");
    } catch {
      setError("The request failed. Check your connection and try again.");
      setStatus("error");
    }
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="caption" className="block font-medium">
          Caption
        </label>
        <textarea
          id="caption"
          value={values.caption}
          onChange={(event) => updateField("caption", event.target.value)}
          className="w-full rounded border p-2"
          required
        />
      </div>

      <div>
        <label htmlFor="photoBlobName" className="block font-medium">
          Photo blob name
        </label>
        <input
          id="photoBlobName"
          value={values.photoBlobName}
          onChange={(event) =>
            updateField("photoBlobName", event.target.value)
          }
          className="w-full rounded border p-2"
          required
        />
      </div>

      <div>
        <label htmlFor="latitude" className="block font-medium">
          Latitude
        </label>
        <input
          id="latitude"
          type="number"
          step="any"
          value={values.latitude}
          onChange={(event) => updateField("latitude", event.target.value)}
          className="w-full rounded border p-2"
          required
        />
      </div>

      <div>
        <label htmlFor="longitude" className="block font-medium">
          Longitude
        </label>
        <input
          id="longitude"
          type="number"
          step="any"
          value={values.longitude}
          onChange={(event) => updateField("longitude", event.target.value)}
          className="w-full rounded border p-2"
          required
        />
      </div>

      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !isReady(values)}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Create post"}
      </button>
    </form>
  );
}