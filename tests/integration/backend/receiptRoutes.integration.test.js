import path from 'path';

jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    pipe: jest.fn(),
    rect: jest.fn().mockReturnThis(),
    fill: jest.fn().mockReturnThis(),
    image: jest.fn().mockReturnThis(),
    fontSize: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    fillColor: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    moveTo: jest.fn().mockReturnThis(),
    lineTo: jest.fn().mockReturnThis(),
    stroke: jest.fn().mockReturnThis(),
    circle: jest.fn().mockReturnThis(),
    end: jest.fn()
  }));
});

import request from 'supertest';
import express from 'express';
import * as url from 'url';
import receiptRoutes from '../../../backend/routes/receiptRoutes.js';

// ---------- BASE APP ----------
const createApp = (mock) => {
  const app = express();
  app.use(express.json());
  app.use('/api/receipts', receiptRoutes(mock));
  return app;
};

// ---------- MOCKS ----------
const successMock = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: "abc12345",
              amount: 100,
              currency: "USD",
              provider: "Stripe",
              status: "Paid",
              paid_at: new Date().toISOString(),
              type: "Deposit",
              Invoice: {
                invoice_number: "INV-1",
                Session: {
                  SessionType: {
                    name: "Test Session",
                    base_price: 100
                  },
                  User: {
                    first_name: "John",
                    last_name: "Doe",
                    email: "john@test.com",
                    phone: "1234567890"
                  }
                }
              }
            },
            error: null
          }))
        }))
      }))
    }))
  }))
};

describe('Receipt Routes', () => {

  test('GET /api/receipts/:invoice_id returns 200', async () => {
    const app = createApp(successMock);
    const res = await request(app).get('/api/receipts/1');
    expect(res.statusCode).toBe(200);
  });

  test('returns 404 if payment not found', async () => {
    const mock = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: null,
                error: { message: "not found" }
              }))
            }))
          }))
        }))
      }))
    };

    const app = createApp(mock);
    const res = await request(app).get('/api/receipts/1');

    expect(res.statusCode).toBe(404);
  });

  test('returns 400 if payment is not Paid', async () => {
    const mock = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: {
                  status: "Pending",
                  Invoice: {
                    Session: {
                      SessionType: {},
                      User: {}
                    }
                  }
                },
                error: null
              }))
            }))
          }))
        }))
      }))
    };

    const app = createApp(mock);
    const res = await request(app).get('/api/receipts/1');

    expect(res.statusCode).toBe(400);
  });

  test('returns 500 on unexpected error', async () => {
    const mock = {
      from: jest.fn(() => {
        throw new Error("DB crash");
      })
    };

    const app = createApp(mock);
    const res = await request(app).get('/api/receipts/1');

    expect(res.statusCode).toBe(500);
  });

  test('covers fallback values (null SessionType + null paid_at)', async () => {
    const mock = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: {
                  id: "fallback",
                  amount: 200,
                  status: "Paid",
                  paid_at: null,
                  type: "Deposit",
                  provider: "Stripe",
                  Invoice: {
                    invoice_number: "INV-2",
                    Session: {
                      SessionType: null,
                      User: {
                        first_name: "Jane",
                        last_name: "Doe",
                        email: "jane@test.com",
                        phone: "123"
                      }
                    }
                  }
                },
                error: null
              }))
            }))
          }))
        }))
      }))
    };

    const app = createApp(mock);
    const res = await request(app).get('/api/receipts/1');

    expect(res.statusCode).toBe(200);
  });

  test('covers empty string edge cases', async () => {
    const mock = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: {
                  id: "edge",
                  amount: 180,
                  status: "Paid",
                  paid_at: new Date().toISOString(),
                  provider: "",
                  type: "",
                  Invoice: {
                    invoice_number: "INV-EDGE",
                    Session: {
                      SessionType: {
                        name: "Portrait",
                        base_price: undefined
                      },
                      User: {
                        first_name: "Edge",
                        last_name: "Case",
                        email: "edge@test.com",
                        phone: "000"
                      }
                    }
                  }
                },
                error: null
              }))
            }))
          }))
        }))
      }))
    };

    const app = createApp(mock);
    const res = await request(app).get('/api/receipts/1');

    expect(res.statusCode).toBe(200);
  });

  test('covers __dirname catch branch', async () => {

  jest.spyOn(path, 'dirname').mockImplementationOnce(() => {
    throw new Error("force dirname failure");
  });

  const app = createApp(successMock);
  const res = await request(app).get('/api/receipts/1');

  expect(res.statusCode).toBe(200); 

  jest.restoreAllMocks();
});

});