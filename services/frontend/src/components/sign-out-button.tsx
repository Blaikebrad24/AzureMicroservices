"use client";

export function SignOutButton() {
  return (
    <button
      onClick={() => {
        window.location.href = "/auth/logout";
      }}
      className="mt-2 block text-xs text-red-600 hover:text-red-800"
    >
      Sign out
    </button>
  );
}
