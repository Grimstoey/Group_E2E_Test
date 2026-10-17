import { expect, test } from '@playwright/test';
import { ElectionApi } from '../support/electionApi';

type Candidate = {
  id: number;
  number: number;
  name: string;
  party: string;
  selected: boolean;
};

test('a voter votes for candidate number 1 and sees only that candidate selected', async ({ request }) => {
  const api = new ElectionApi(request);
  const voter = {
    nationalId: '9201075668338',
    password: 'voter1234',
    firstName: 'สุดา',
    lastName: 'เลือกดี',
    address: '88 ถนนเชียงใหม่-ลำพูน',
    districtId: 'CM-2',
  };

  await test.step('voter registers', async () => {
    const res = await api.register(voter);
    expect(res.status(), await res.text()).toBe(201);
  });

  const token = await test.step('voter logs in', () =>
    api.login({ nationalId: voter.nationalId, password: voter.password }),
  );

  const candidateId = await test.step('voter finds candidate number 1', async () => {
    const res = await api.myCandidates(token);
    expect(res.status(), await res.text()).toBe(200);
    const candidates = (await res.json()) as Candidate[];
    const candidate = candidates.find((item) => item.number === 1);
    expect(candidate).toEqual({
      id: expect.any(Number),
      number: 1,
      name: 'อนันต์ ศรีสุข',
      party: 'พรรคดอยสุเทพ',
      selected: false,
    });
    return candidate!.id;
  });

  await test.step('voter votes for candidate number 1', async () => {
    const res = await api.vote(token, candidateId);
    expect(res.status(), await res.text()).toBe(201);
    expect(await res.json()).toEqual({
      candidateId,
      changed: false,
      votedAt: expect.any(String),
    });
  });

  await test.step('only candidate number 1 is selected', async () => {
    const res = await api.myCandidates(token);
    expect(res.status(), await res.text()).toBe(200);
    expect(await res.json()).toEqual([
      { id: candidateId, number: 1, name: 'อนันต์ ศรีสุข', party: 'พรรคดอยสุเทพ', selected: true },
      { id: expect.any(Number), number: 2, name: 'มาลี วงศ์คำ', party: 'พรรคแม่ปิง', selected: false },
    ]);
  });
});
