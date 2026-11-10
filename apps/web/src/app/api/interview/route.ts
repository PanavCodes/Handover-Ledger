import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";

export async function GET() {
  const session = await getSession();
  const questions = Store.getInterviewQuestions();

  const pending = questions.filter((q) => q.status === "pending").length;
  const answered = questions.filter((q) => q.status === "answered").length;
  const skipped = questions.filter((q) => q.status === "skipped").length;

  return NextResponse.json({
    persona: session.persona,
    questions,
    summary: {
      total: questions.length,
      pending,
      answered,
      skipped,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (session.persona !== "leaver" && session.persona !== "lead") {
    return NextResponse.json(
      {
        error:
          "Role Restricted: Only Departing Owner (Rahul Mehta) or Project Lead (Dr. Meera) can submit interview attestations.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { action = "answer", questionId, answerText, skipReason } = body;

    if (!questionId || typeof questionId !== "string") {
      return NextResponse.json({ error: "questionId is required" }, { status: 400 });
    }

    const actor =
      session.persona === "leaver" ? "Rahul Mehta (Leaver)" : "Dr. Meera Iyer (Lead)";

    if (action === "skip") {
      if (!skipReason || typeof skipReason !== "string" || skipReason.trim().length < 4) {
        return NextResponse.json(
          { error: "Please provide a brief reason (min 4 characters) when skipping an open gap." },
          { status: 400 }
        );
      }

      const result = Store.skipInterviewQuestion(questionId, skipReason, actor);
      if (!result) {
        return NextResponse.json({ error: "Interview question not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, ...result });
    }

    if (!answerText || typeof answerText !== "string" || answerText.trim().length < 12) {
      return NextResponse.json(
        {
          error:
            "Attested answer must be at least 12 characters so a verifiable citation record can be created.",
        },
        { status: 400 }
      );
    }

    const result = Store.answerInterviewQuestion(questionId, answerText, actor);
    if (!result) {
      return NextResponse.json({ error: "Interview question not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      question: result.question,
      claim: result.claim,
    });
  } catch {
    return NextResponse.json({ error: "Failed to save interview response" }, { status: 500 });
  }
}

