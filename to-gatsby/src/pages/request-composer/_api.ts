import { useSelector } from "react-redux"
import { useEffect, useState, useCallback } from "react"

export type GetReportsResponse = gapi.client.analyticsreporting.GetReportsResponse
export type Column = gapi.client.analytics.Column
export type Segment = gapi.client.analytics.Segment

type ReportingAPI = typeof gapi.client.analyticsreporting
type MetadataAPI = gapi.client.analytics.MetadataResource
type ManagementAPI = typeof gapi.client.analytics.management

export enum SamplingLevel {
  Default = "DEFAULT",
  SMALL = "SMALL",
  LARGE = "LARGE",
}

export const useAnalyticsReportingAPI = (): ReportingAPI | undefined => {
  const gapi = useSelector((state: AppState) => state.gapi)
  const [reportingAPI, setReportingAPI] = useState<ReportingAPI>()

  useEffect(() => {
    if (gapi === undefined) {
      return
    }
    setReportingAPI(gapi.client.analyticsreporting)
  }, [gapi])

  return reportingAPI
}

const useMetadataAPI = (): MetadataAPI | undefined => {
  const gapi = useSelector((state: AppState) => state.gapi)
  const [metadataAPI, setMetadataAPI] = useState<MetadataAPI>()

  useEffect(() => {
    if (gapi === undefined) {
      return
    }
    setMetadataAPI(gapi.client.analytics.metadata as any)
  }, [gapi])

  return metadataAPI
}

const useManagementAPI = (): ManagementAPI | undefined => {
  const gapi = useSelector((state: AppState) => state.gapi)
  const [managementAPI, setManagementAPI] = useState<ManagementAPI>()

  useEffect(() => {
    if (gapi === undefined) {
      return
    }
    setManagementAPI(gapi.client.analytics.management)
  }, [gapi])

  return managementAPI
}

export const useDimensionsAndMetrics = () => {
  const metadataAPI = useMetadataAPI()
  const [dimensions, setDimensions] = useState<Column[]>()
  const [metrics, setMetrics] = useState<Column[]>()

  useEffect(() => {
    if (metadataAPI === undefined) {
      return
    }
    metadataAPI.columns.list({ reportType: "ga" }).then(response => {
      const columns = response.result.items || []
      const dimensions = columns.filter(
        column => column.attributes?.type === "DIMENSION"
      )
      setDimensions(dimensions)
      const metrics = columns.filter(
        column => column.attributes?.type === "METRIC"
      )
      setMetrics(metrics)
    })
  }, [metadataAPI])

  return { dimensions, metrics }
}

export const useSegments = () => {
  const managementAPI = useManagementAPI()
  const [segments, setSegments] = useState<Segment[]>()

  useEffect(() => {
    if (managementAPI === undefined) {
      return
    }

    managementAPI.segments.list({}).then(response => {
      setSegments(response.result.items)
    })
  }, [managementAPI])

  return segments
}

type GetReportsRequest = gapi.client.analyticsreporting.GetReportsRequest

export const useMakeReportsRequest = (
  requestObject: GetReportsRequest | undefined
) => {
  const reportingAPI = useAnalyticsReportingAPI()
  const [response, setResponse] = useState<GetReportsResponse>()
  const [longRequest, setLongRequest] = useState(false)

  const makeRequest = useCallback(() => {
    if (reportingAPI === undefined || requestObject === undefined) {
      return
    }
    ;(async () => {
      const first = await Promise.race<string>([
        (async () => {
          const response = await reportingAPI.reports.batchGet(
            {},
            requestObject
          )
          setResponse(response.result)
          setTimeout(() => {
            setLongRequest(false)
          }, 500)
          return "API"
        })(),
        new Promise<string>(resolve => {
          window.setTimeout(() => {
            resolve("TIMEOUT")
          }, 300)
        }),
      ])
      if (first === "TIMEOUT") {
        setLongRequest(true)
      }
    })()
  }, [reportingAPI, requestObject])

  return { makeRequest, response, longRequest }
}
