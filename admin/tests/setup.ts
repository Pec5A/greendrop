import { vi } from "vitest";

// Mock Firebase Admin SDK
vi.mock("@/lib/firebase-admin", () => {
  const mockCollection = vi.fn();
  const mockDoc = vi.fn();
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  const mockUpdate = vi.fn();
  const mockWhere = vi.fn();
  const mockOrderBy = vi.fn();
  const mockLimit = vi.fn();
  const mockStartAfter = vi.fn();
  const mockCount = vi.fn();
  const mockAdd = vi.fn();

  // Chainable mock
  const createChainableMock = () => {
    const mock: Record<string, ReturnType<typeof vi.fn>> = {};
    mock.collection = mockCollection.mockReturnValue(mock);
    mock.doc = mockDoc.mockReturnValue(mock);
    mock.get = mockGet.mockResolvedValue({ exists: false, data: () => null, docs: [] });
    mock.set = mockSet.mockResolvedValue(undefined);
    mock.update = mockUpdate.mockResolvedValue(undefined);
    mock.where = mockWhere.mockReturnValue(mock);
    mock.orderBy = mockOrderBy.mockReturnValue(mock);
    mock.limit = mockLimit.mockReturnValue(mock);
    mock.startAfter = mockStartAfter.mockReturnValue(mock);
    mock.count = mockCount.mockReturnValue(mock);
    mock.add = mockAdd.mockResolvedValue({ id: "mock-id" });
    return mock;
  };

  const mockDb = createChainableMock();

  const mockAuth = {
    verifyIdToken: vi.fn().mockResolvedValue({ uid: "test-user-id" }),
  };

  const mockStorage = {
    bucket: vi.fn().mockReturnValue({
      file: vi.fn().mockReturnValue({
        save: vi.fn(),
        getSignedUrl: vi.fn().mockResolvedValue(["https://storage.example.com/file"]),
      }),
    }),
  };

  return {
    adminDb: mockDb,
    adminAuth: mockAuth,
    adminStorage: mockStorage,
    __mockCollection: mockCollection,
    __mockDoc: mockDoc,
    __mockGet: mockGet,
    __mockSet: mockSet,
    __mockUpdate: mockUpdate,
    __mockWhere: mockWhere,
    __mockOrderBy: mockOrderBy,
    __mockLimit: mockLimit,
    __mockAdd: mockAdd,
  };
});

// Mock environment variables
process.env.FIREBASE_ADMIN_PROJECT_ID = "test-project";
process.env.FIREBASE_ADMIN_CLIENT_EMAIL = "test@test-project.iam.gserviceaccount.com";
process.env.FIREBASE_ADMIN_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----";
process.env.STRIPE_SECRET_KEY = "sk_test_mock";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock";
