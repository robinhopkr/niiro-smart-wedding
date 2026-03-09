export const MUSIC_VOTER_COOKIE_NAME = 'mywed_music_vote_id'

export function createMusicVisitorToken(): string {
  return `music-${crypto.randomUUID()}`
}
