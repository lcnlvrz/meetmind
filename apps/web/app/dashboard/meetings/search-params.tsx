import {
  parseAsFloat,
  createLoader,
  parseAsIsoDateTime,
  inferParserType,
  parseAsString,
  parseAsBoolean,
} from 'nuqs/server'

export const meetingSearchParamsParsers = {
  page: parseAsFloat.withDefault(1),
  limit: parseAsFloat.withDefault(10),
  date_from: parseAsIsoDateTime,
  date_to: parseAsIsoDateTime,
  search: parseAsString,
  semantic_search_enabled: parseAsBoolean.withDefault(false),
}

export const loadSearchParams = createLoader(meetingSearchParamsParsers)

export type MeetingsSearchParams = inferParserType<
  typeof meetingSearchParamsParsers
>
