import { Link } from "react-router-dom"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { calculators } from "@/calculators"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-10 text-center">
          <img
            src="https://warera.wiki/warera_logo.png"
            alt="Warera"
            className="mx-auto mb-4 h-20 w-20"
          />
          <h1 className="mb-2 text-4xl font-bold tracking-tight">
            Warera Calculators
          </h1>
          <p className="text-zinc-400">
            Production & economy tools for Warera
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {calculators.map((calc) => (
            <Link key={calc.path} to={calc.path}>
              <Card className="h-full cursor-pointer transition-colors hover:border-zinc-600 hover:bg-zinc-900">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                    <img
                      src={`${import.meta.env.BASE_URL}images/${calc.icon}.svg`}
                      alt={calc.name}
                      className="h-5 w-5 text-zinc-300"
                    />
                  </div>
                  <CardTitle>{calc.name}</CardTitle>
                  <CardDescription>{calc.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
