"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/gallery");
  }, [router]); // Only runs once when component mounts

  return null; // Optional: render nothing as the component immediately redirects
}
