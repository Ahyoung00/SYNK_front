// Google Identity Services 글로벌 타입
interface Window {
  google: {
    accounts: {
      oauth2: {
        initTokenClient: (config: {
          client_id: string
          scope:     string
          callback:  (response: { access_token?: string; error?: string }) => void
        }) => { requestAccessToken: () => void }
      }
    }
  }
}
