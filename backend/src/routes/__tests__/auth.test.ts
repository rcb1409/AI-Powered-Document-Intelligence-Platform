import request from "supertest";
import app from "../../app";

jest.mock("../../services/authService", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed"),
  comparePassword: jest.fn(),
  generateToken: jest.fn().mockReturnValue("fake-jwt-token"),
  findUserByEmail: jest.fn(),
  createLocalUser: jest.fn(),
}));

const authService = require("../../services/authService");

describe("POST /api/auth/register", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ password: "secret" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email and password/i);
    expect(authService.createLocalUser).not.toHaveBeenCalled();
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email and password/i);
  });

  it("returns 400 when email already registered", async () => {
    authService.findUserByEmail.mockResolvedValue({ id: 1, email: "a@b.com" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com", password: "secret" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already registered/i);
    expect(authService.createLocalUser).not.toHaveBeenCalled();
  });

  it("returns 201 and token when registration succeeds", async () => {
    authService.findUserByEmail.mockResolvedValue(null);
    authService.createLocalUser.mockResolvedValue({
      id: 1,
      email: "new@b.com",
      created_at: new Date(),
    });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "new@b.com", password: "secret" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBe("fake-jwt-token");
    expect(res.body.user.email).toBe("new@b.com");
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 when email or password missing", async () => {
    const r1 = await request(app).post("/api/auth/login").send({ password: "x" });
    const r2 = await request(app).post("/api/auth/login").send({ email: "a@b.com" });
    expect(r1.status).toBe(400);
    expect(r2.status).toBe(400);
  });

  it("returns 401 when user not found", async () => {
    authService.findUserByEmail.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nope@b.com", password: "secret" });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it("returns 401 when password wrong", async () => {
    authService.findUserByEmail.mockResolvedValue({
      id: 1,
      email: "a@b.com",
      password_hash: "hashed",
    });
    authService.comparePassword.mockResolvedValue(false);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it("returns 200 and token when login succeeds", async () => {
    authService.findUserByEmail.mockResolvedValue({
      id: 1,
      email: "a@b.com",
      password_hash: "hashed",
    });
    authService.comparePassword.mockResolvedValue(true);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com", password: "secret" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBe("fake-jwt-token");
    expect(res.body.user.email).toBe("a@b.com");
  });
});