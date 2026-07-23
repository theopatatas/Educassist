import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMail } from "../../backend/src/utils/mail";

describe("EducAssist mail branding", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses only the EducAssist endpoint and sender names", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendMail({
      to: "student@example.test",
      toName: "Student",
      subject: "EducAssist Sign Up OTP",
      html: "<p>Your EducAssist OTP is 123456.</p>",
      text: "Your EducAssist OTP is 123456.",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] as [
      string,
      { body: string },
    ];
    expect(url).toBe(
      "https://unokamaleg.com/mail-api/theoss-mail.php",
    );
    expect(JSON.parse(request.body)).toMatchObject({
      from_name: "EducAssist",
      reply_to_name: "EducAssist",
      subject: "EducAssist Sign Up OTP",
    });
    expect(request.body).not.toMatch(/FDMST|Flores-Dizon|theo-mail\.php/i);
  });
});
