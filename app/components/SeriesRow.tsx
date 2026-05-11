import { supabase } from '../lib/supabase'
import SeriesRowClient from './SeriesRowClient'

export default async function SeriesRow() {
  const { data: seriesList } = await supabase
    .from('series')
    .select('*, seasons(id, episodes(id))')
    .order('created_at', { ascending: false })
    .limit(18)

  if (!seriesList || seriesList.length === 0) return null

  return <SeriesRowClient seriesList={seriesList} />
}