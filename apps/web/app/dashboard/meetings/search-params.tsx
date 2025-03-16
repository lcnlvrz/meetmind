import {
  parseAsFloat,
  createLoader,
  parseAsIsoDateTime,
  inferParserType,
  parseAsString,
} from 'nuqs/server'

export const meetingSearchParamsParsers = {
  page: parseAsFloat.withDefault(1),
  limit: parseAsFloat.withDefault(10),
  date_from: parseAsIsoDateTime,
  date_to: parseAsIsoDateTime,
  search: parseAsString,
}

export const loadSearchParams = createLoader(meetingSearchParamsParsers)

export type MeetingsSearchParams = inferParserType<
  typeof meetingSearchParamsParsers
>
