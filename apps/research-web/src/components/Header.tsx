'use client'

import { UserButton, useUser } from '@clerk/nextjs'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Skeleton } from './ui/skeleton'

export function Header() {
  const { isLoaded } = useUser()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">B2Beast</h1>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />

          <div className="h-8 w-8">
            {!isLoaded ? (
              <Skeleton className="h-8 w-8 rounded-full" />
            ) : (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8',
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
