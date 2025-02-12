import Link from "next/link"

export function MainNav() {
  return (
    <div className="flex items-center w-[150px]">
      <Link href="/" className="font-semibold text-xl">
        Home
      </Link>
    </div>
  )
}

