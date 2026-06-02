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
        initCodeClient: (config: {
          client_id:    string
          scope:        string
          redirect_uri: string
          callback:     (response: { code?: string; error?: string }) => void
        }) => { requestCode: () => void }
      }
    }
  }
}
