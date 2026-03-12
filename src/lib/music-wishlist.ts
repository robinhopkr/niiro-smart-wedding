export const MUSIC_VOTER_COOKIE_NAME = 'niiro_smart_wedding_music_vote_id'

export function createMusicVisitorToken(): string {
  return `music-${crypto.randomUUID()}`
}
