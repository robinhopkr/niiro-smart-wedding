'use client'

import { Music2, ThumbsUp, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import type { ApiResponse } from '@/types/api'
import type { MusicWishlistData } from '@/types/wedding'

interface MusicWishlistSectionProps {
  initialData: MusicWishlistData
  interactive?: boolean
  mode?: 'demo' | 'live'
}

export function MusicWishlistSection({
  initialData,
  interactive = true,
  mode = 'live',
}: MusicWishlistSectionProps) {
  const [data, setData] = useState(initialData)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [requestedBy, setRequestedBy] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [votingRequestId, setVotingRequestId] = useState<string | null>(null)

  useEffect(() => {
    if (!interactive || mode !== 'live' || !initialData.enabled) {
      return
    }

    let isCancelled = false

    async function loadWishlist() {
      try {
        const response = await fetch('/api/music-requests', {
          cache: 'no-store',
        })
        const result = (await response.json()) as ApiResponse<MusicWishlistData>

        if (!isCancelled && response.ok && result.success) {
          setData(result.data)
        }
      } catch {
        // Keep the server-rendered fallback if the refresh fails.
      }
    }

    void loadWishlist()

    return () => {
      isCancelled = true
    }
  }, [initialData.enabled, interactive, mode])

  if (!data.enabled) {
    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (mode !== 'live') {
      toast.message('Die Musikwunschliste ist in der Demo nicht aktiv.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/music-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          artist,
          requestedBy,
        }),
      })

      const result = (await response.json()) as ApiResponse<MusicWishlistData>

      if (!response.ok || !result.success) {
        toast.error(result.success ? 'Der Musikwunsch konnte nicht gespeichert werden.' : result.error)
        return
      }

      setData(result.data)
      setTitle('')
      setArtist('')
      setRequestedBy('')
      toast.success(result.message ?? 'Musikwunsch hinzugefuegt.')
    } catch {
      toast.error('Der Musikwunsch konnte gerade nicht gespeichert werden.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVote(requestId: string) {
    if (mode !== 'live') {
      toast.message('Voting ist in der Demo nicht aktiv.')
      return
    }

    setVotingRequestId(requestId)

    try {
      const response = await fetch('/api/music-requests/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
        }),
      })

      const result = (await response.json()) as ApiResponse<MusicWishlistData>

      if (!response.ok || !result.success) {
        toast.error(result.success ? 'Deine Stimme konnte nicht gespeichert werden.' : result.error)
        return
      }

      setData(result.data)
      toast.success(result.message ?? 'Deine Stimme wurde gespeichert.')
    } catch {
      toast.error('Deine Stimme konnte gerade nicht gespeichert werden.')
    } finally {
      setVotingRequestId(null)
    }
  }

  const hasTopTen = data.requests.length >= 10

  return (
    <Section density="compact" id="musik" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <SectionHeading>Musikwunschliste</SectionHeading>
          <p className="text-charcoal-600">
            Wuenscht euch Songs fuer die Party und stimmt fuer eure Favoriten ab. Je mehr Daumen hoch
            ein Wunsch bekommt, desto weiter steigt er in der Liste.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">{data.requests.length} Songs</Badge>
          <Badge variant="neutral">
            {data.requests.reduce((sum, request) => sum + request.votes, 0)} Stimmen
          </Badge>
        </div>
      </div>

      {interactive ? (
        <form className="surface-card grid gap-4 px-6 py-6 lg:grid-cols-[1.2fr_1fr_1fr_auto]" onSubmit={handleSubmit}>
          <Input
            label="Songtitel"
            placeholder="Zum Beispiel Dancing Queen"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Input
            label="Interpret/in"
            placeholder="Optional"
            value={artist}
            onChange={(event) => setArtist(event.target.value)}
          />
          <Input
            label="Dein Name"
            placeholder="Optional"
            value={requestedBy}
            onChange={(event) => setRequestedBy(event.target.value)}
          />
          <div className="flex items-end">
            <Button loading={isSubmitting} type="submit">
              <Music2 className="h-4 w-4" />
              Hinzufuegen
            </Button>
          </div>
        </form>
      ) : null}

      {data.requests.length ? (
        <div className="space-y-4">
          {data.requests.map((request) => (
            <article key={request.id} className="surface-card px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-cream-100 px-3 text-sm font-semibold text-charcoal-800">
                      #{request.rank}
                    </span>
                    {hasTopTen && request.isTopTen ? (
                      <Badge variant="attending">
                        <Trophy className="mr-1 h-3 w-3" />
                        Top 10
                      </Badge>
                    ) : null}
                  </div>
                  <div>
                    <h3 className="font-display text-card text-charcoal-900">{request.title}</h3>
                    <p className="mt-1 text-charcoal-600">
                      {request.artist ? request.artist : 'Interpret/in offen'}
                      {request.requestedBy ? ` · gewuenscht von ${request.requestedBy}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-full bg-cream-100 px-4 py-3 text-sm font-semibold text-charcoal-800">
                    {request.votes} {request.votes === 1 ? 'Stimme' : 'Stimmen'}
                  </div>
                  {interactive ? (
                    <Button
                      disabled={request.hasVoted}
                      loading={votingRequestId === request.id}
                      type="button"
                      variant={request.hasVoted ? 'ghost' : 'secondary'}
                      onClick={() => handleVote(request.id)}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      {request.hasVoted ? 'Schon gevotet' : 'Daumen hoch'}
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-cream-300 bg-cream-50 px-6 py-6 text-charcoal-600">
          Noch keine Musikwünsche vorhanden. Der erste Song kann direkt hier eingetragen werden.
        </div>
      )}
    </Section>
  )
}
