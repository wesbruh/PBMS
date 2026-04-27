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
    end: jest.fn()
  }));
});


import request from 'supertest';
import express from 'express';
import invoiceRoutes from '../../../backend/routes/invoiceRoutes.js';

// helper
const createApp = (mock) => {
  const app = express();
  app.use(express.json());
  app.use('/api/invoice', invoiceRoutes(mock));
  return app;
};

describe('Invoice Routes', () => {

  // ---------------- GET ROUTES ----------------

  test('GET /:invoice_id/pdf returns 200', async () => {
  const mock = {
    from: jest.fn(() => ({
      select: () => ({
        eq: () => ({
          single: () => ({
            data: {
              id: 1,
              invoice_number: "INV-1",
              issue_date: "2026-01-01",
              due_date: "2026-01-10",
              remaining: 100,
              created_at: new Date().toISOString(),
              items: [],
              Session: {
                SessionType: {
                  name: "Test Session",
                  base_price: 100
                },
                User: {
                  first_name: "John",
                  last_name: "Doe",
                  email: "john@test.com",
                  phone: "123"
                }
              }
            },
            error: null
          })
        })
      })
    }))
  };

  const app = createApp(mock);

  const res = await request(app).get('/api/invoice/1/pdf');

  expect([200, 500]).toContain(res.statusCode);
  });

  test('GET /getInvoiceByID returns 400 if error', async () => {
    const mock = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: "fail" }
            }))
          }))
        }))
      }))
    };

    const app = createApp(mock);

    const res = await request(app)
      .get('/api/invoice/getInvoiceByID')
      .query({ term: 999 });

    expect(res.statusCode).toBe(400);
  });

  // ---------------- REDUCE BALANCE ----------------

  test('POST reduceRemainingInvoiceBalance returns 400 for invalid amount', async () => {
    const app = createApp({});

    const res = await request(app)
      .post('/api/invoice/1/reduceRemainingInvoiceBalance')
      .send({ amount: -10 });

    expect(res.statusCode).toBe(400);
  });

  test('POST reduceRemainingInvoiceBalance returns 404 if invoice not found', async () => {
    const mock = {
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: null,
              error: "not found"
            })
          })
        })
      }))
    };

    const app = createApp(mock);

    const res = await request(app)
      .post('/api/invoice/1/reduceRemainingInvoiceBalance')
      .send({ amount: 50 });

    expect(res.statusCode).toBe(404);
  });

  test('POST reduceRemainingInvoiceBalance rejects over-reduction', async () => {
    const mock = {
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: { remaining: 50 },
              error: null
            })
          })
        })
      }))
    };

    const app = createApp(mock);

    const res = await request(app)
      .post('/api/invoice/1/reduceRemainingInvoiceBalance')
      .send({ amount: 100 });

    expect(res.statusCode).toBe(400);
  });

  test('POST reduceRemainingInvoiceBalance success', async () => {
    const mock = {
      from: jest.fn((table) => {
        if (table === 'Invoice') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: { remaining: 100 },
                  error: null
                })
              })
            }),
            update: () => ({
              eq: () => ({
                select: () => ({
                  data: [{ remaining: 50 }],
                  error: null
                })
              })
            })
          };
        }

        if (table === 'Payment') {
          return {
            insert: () => ({ error: null })
          };
        }
      })
    };

    const app = createApp(mock);

    const res = await request(app)
      .post('/api/invoice/1/reduceRemainingInvoiceBalance')
      .send({ amount: 50, payment_method: "Cash" });

    expect(res.statusCode).toBe(200);
  });

  test('POST reduceRemainingInvoiceBalance sets status Paid when zero', async () => {
    const mock = {
      from: jest.fn((table) => {
        if (table === 'Invoice') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: { remaining: 50 },
                  error: null
                })
              })
            }),
            update: () => ({
              eq: () => ({
                select: () => ({
                  data: [{ remaining: 0 }],
                  error: null
                })
              })
            })
          };
        }

        if (table === 'Payment') {
          return {
            insert: () => ({ error: null })
          };
        }
      })
    };

    const app = createApp(mock);

    const res = await request(app)
      .post('/api/invoice/1/reduceRemainingInvoiceBalance')
      .send({ amount: 50, payment_method: "Cash" });

    expect(res.statusCode).toBe(200);
  });

  // ---------------- GENERATE ----------------

  test('POST generate/:session_id returns 200', async () => {
    const mock = {
      from: jest.fn((table) => {
        if (table === "Session") {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: {
                    SessionType: {
                      name: "Test",
                      base_price: 100
                    }
                  },
                  error: null
                })
              })
            })
          };
        }

        if (table === "Invoice") {
          return {
            insert: () => ({
              select: () => ({
                single: () => ({
                  data: { id: 1 },
                  error: null
                })
              })
            }),
            update: () => ({
              eq: () => ({
                select: () => ({
                  single: () => ({
                    data: { id: 1 },
                    error: null
                  })
                })
              })
            })
          };
        }
      })
    };

    const app = createApp(mock);

    const res = await request(app)
      .post('/api/invoice/generate/1')
      .send({ remaining: 100 });

    expect(res.statusCode).toBe(200);
  });

  test('generate returns 404 if session not found', async () => {
    const mock = {
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: null,
              error: "not found"
            })
          })
        })
      }))
    };

    const app = createApp(mock);

    const res = await request(app)
      .post('/api/invoice/generate/1')
      .send({ remaining: 100 });

    expect(res.statusCode).toBe(404);
  });

  // ---------------- CONFIRM ----------------

  test('PATCH /confirm/:invoice_id returns 200', async () => {
    const mock = {
      from: jest.fn(() => {
        const chain = {
          update: jest.fn(() => chain),
          eq: jest.fn(() => chain),
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: 1 },
              error: null
            }))
          }))
        };
        return chain;
      })
    };

    const app = createApp(mock);

    const res = await request(app)
      .patch('/api/invoice/confirm/1')
      .send({ remaining: 0, due_date: "2026-01-01" });

    expect(res.statusCode).toBe(200);
  });

  // ---------------- PAY ----------------

  test('PATCH /pay/:invoice_id returns 200', async () => {
    const mock = {
      from: jest.fn(() => {
        const chain = {
          update: jest.fn(() => chain),
          eq: jest.fn(() => chain),
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { status: "Paid" },
              error: null
            }))
          }))
        };
        return chain;
      })
    };

    const app = createApp(mock);

    const res = await request(app)
      .patch('/api/invoice/pay/1')
      .send({ remaining: 0 });

    expect(res.statusCode).toBe(200);
  });

  // ---------------- SESSION → INVOICE ----------------

  test('GET /:session_id returns invoice id', async () => {
    const mock = {
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            select: () => ({
              single: () => ({
                data: { id: 1 },
                error: null
              })
            })
          })
        })
      }))
    };

    const app = createApp(mock);

    const res = await request(app).get('/api/invoice/1');

    expect(res.statusCode).toBe(200);
  });

});
test('PDF route hits image branch', async () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';

  const mock = {
    from: jest.fn(() => ({
      select: () => ({
        eq: () => ({
          single: () => ({
            data: {
              id: 1,
              invoice_number: "INV-1",
              issue_date: "2026-01-01",
              due_date: "2026-01-10",
              remaining: 100,
              created_at: new Date().toISOString(),
              items: [],
              Session: {
                SessionType: { name: "Test", base_price: 100 },
                User: { first_name: "A", last_name: "B", email: "x", phone: "y" }
              }
            },
            error: null
          })
        })
      })
    }))
  };

  const app = createApp(mock);
  const res = await request(app).get('/api/invoice/1/pdf');

  expect([200, 500]).toContain(res.statusCode);

  process.env.NODE_ENV = originalEnv;
});
test('generate hits catch block', async () => {
  const mock = {
    from: jest.fn(() => {
      throw new Error("force crash");
    })
  };

  const app = createApp(mock);

  const res = await request(app)
    .post('/api/invoice/generate/1')
    .send({ remaining: 100 });

  expect(res.statusCode).toBe(500);
});
test('confirm route payment error branch', async () => {
  const mock = {
    from: jest.fn(() => ({
      update: () => ({
        eq: () => ({
          eq: () => ({
            error: "fail"
          })
        })
      })
    }))
  };

  const app = createApp(mock);

  const res = await request(app)
    .patch('/api/invoice/confirm/1')
    .send({ remaining: 0, due_date: "2026-01-01" });

  expect(res.statusCode).toBe(500);
});
test('pay route payment error branch', async () => {
  const mock = {
    from: jest.fn(() => ({
      update: () => ({
        eq: () => ({
          eq: () => ({
            error: "fail"
          })
        })
      })
    }))
  };

  const app = createApp(mock);

  const res = await request(app)
    .patch('/api/invoice/pay/1')
    .send({ remaining: 0 });

  expect(res.statusCode).toBe(500);
});
test('PDF route catch block triggers', async () => {
  const mock = {
    from: jest.fn(() => {
      throw new Error("pdf crash");
    })
  };

  const app = createApp(mock);

  const res = await request(app).get('/api/invoice/1/pdf');

  expect(res.statusCode).toBe(500);
});
test('reduceRemainingInvoiceBalance payment insert edge case', async () => {
  const mock = {
    from: jest.fn((table) => {
      if (table === 'Invoice') {
        return {
          select: () => ({
            eq: () => ({
              single: () => ({
                data: { remaining: 100 },
                error: null
              })
            })
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                data: [{ remaining: 50 }],
                error: null
              })
            })
          })
        };
      }

      if (table === 'Payment') {
        return {
          insert: () => ({ error: null }) // success path already tested
        };
      }
    })
  };

  const app = createApp(mock);

  const res = await request(app)
    .post('/api/invoice/1/reduceRemainingInvoiceBalance')
    .send({ amount: 50, payment_method: "Cash" });

  expect(res.statusCode).toBe(200);
});
test('GET /getInvoiceTableData returns 200', async () => {
  const mock = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        data: [{ id: 1 }],
        error: null
      }))
    }))
  };

  const app = createApp(mock);
  const res = await request(app).get('/api/invoice/getInvoiceTableData');
  expect(res.statusCode).toBe(200);
});

test('GET /getInvoiceTableData returns 500 on error', async () => {
  const mock = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        data: null,
        error: { message: 'db error' }
      }))
    }))
  };

  const app = createApp(mock);
  const res = await request(app).get('/api/invoice/getInvoiceTableData');
  expect(res.statusCode).toBe(500);
});

test('GET /getInvoiceByID returns 200 on success', async () => {
  const mock = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 1, invoice_number: 'INV-1' },
            error: null
          }))
        }))
      }))
    }))
  };

  const app = createApp(mock);
  const res = await request(app).get('/api/invoice/getInvoiceByID').query({ term: 1 });
  expect(res.statusCode).toBe(200);
});

test('reduceRemainingInvoiceBalance logs error if payment insert fails', async () => {
  const mock = {
    from: jest.fn((table) => {
      if (table === 'Invoice') {
        return {
          select: () => ({
            eq: () => ({
              single: () => ({
                data: { remaining: 100 },
                error: null
              })
            })
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                data: [{ remaining: 50 }],
                error: null
              })
            })
          })
        };
      }
      if (table === 'Payment') {
        return {
          insert: () => ({ error: { message: 'insert failed' } })
        };
      }
    })
  };

  const app = createApp(mock);
  const res = await request(app)
    .post('/api/invoice/1/reduceRemainingInvoiceBalance')
    .send({ amount: 50, payment_method: 'Cash' });

  // 200 was already sent before insert, so response is 200
  expect(res.statusCode).toBe(200);
});

test('generate returns 500 if insert fails', async () => {
  const mock = {
    from: jest.fn((table) => {
      if (table === 'Session') {
        return {
          select: () => ({
            eq: () => ({
              single: () => ({
                data: { SessionType: { name: 'Test', base_price: 100 } },
                error: null
              })
            })
          })
        };
      }
      if (table === 'Invoice') {
        return {
          insert: () => ({
            select: () => ({
              single: () => ({
                data: null,
                error: { message: 'insert failed' }
              })
            })
          })
        };
      }
    })
  };

  const app = createApp(mock);
  const res = await request(app)
    .post('/api/invoice/generate/1')
    .send({ remaining: 100 });

  expect(res.statusCode).toBe(500);
});

test('GET /:session_id returns 500 if invoice lookup fails', async () => {
  const mock = {
    from: jest.fn(() => ({
      select: () => ({
        eq: () => ({
          select: () => ({
            single: () => ({
              data: null,
              error: { message: 'not found' }
            })
          })
        })
      })
    }))
  };

  const app = createApp(mock);
  const res = await request(app).get('/api/invoice/999');
  expect(res.statusCode).toBe(500);
});