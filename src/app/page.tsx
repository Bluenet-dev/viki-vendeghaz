import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-24">
      <h1 className="text-4xl font-bold">BlueNet Core v1.0</h1>
      <p className="text-gray-500">
        A rendszer üzemkész. Catalyst UI + Next.js 16 + Tailwind v4.
      </p>
    </div>
  );
}
