export interface TokenPort {
  getToken(): Promise<string>;
}
