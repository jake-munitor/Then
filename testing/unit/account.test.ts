import { deleteAccountData } from '../../src/services/account';
import { callFunction } from '../../src/services/cloudFunctions';

jest.mock('../../src/services/cloudFunctions', () => ({
  callFunction: jest.fn(async () => ({ ok: true })),
}));

describe('account cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates destructive account cleanup to the backend', async () => {
    await deleteAccountData();
    expect(callFunction).toHaveBeenCalledWith('deleteAccount');
  });
});
