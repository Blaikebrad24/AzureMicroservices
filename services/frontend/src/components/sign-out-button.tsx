"use client";

export function SignOutButton() {
  return (
    <button
      onClick={() => {
        window.location.href = "/auth/logout";
      }}
      className="mt-2 block text-xs text-red-400 hover:text-red-300"
    >
      Sign out
    </button>
  );
}
