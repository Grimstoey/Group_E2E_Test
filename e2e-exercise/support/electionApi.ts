import { APIRequestContext, APIResponse, expect } from '@playwright/test';

export type Credentials = {
  nationalId: string;
  password: string;
};

export type VoterRegistration = Credentials & {
  firstName: string;
  lastName: string;
  address: string;
  districtId: string;
};

// Talks to the running Election API over HTTP only.
export class ElectionApi {
  constructor(private readonly request: APIRequestContext) {}

  register(voter: VoterRegistration): Promise<APIResponse> {
    return this.request.post('/auth/register', { data: voter });
  }

  async login(credentials: Credentials): Promise<string> {
    const res = await this.request.post('/auth/login', { data: credentials });
    expect(res.status(), await res.text()).toBe(200);
    const { token } = await res.json();
    expect(token).toEqual(expect.any(String));
    return token;
  }

  myCandidates(token: string): Promise<APIResponse> {
    return this.request.get('/me/candidates', { headers: auth(token) });
  }

  vote(token: string, candidateId: number): Promise<APIResponse> {
    return this.request.put('/me/vote', {
      headers: auth(token),
      data: { candidateId },
    });
  }
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}
