package io.github.pswgames.seowoocheck;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.os.UserManager;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private UserManager userManager;
    private String reportText = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        userManager = (UserManager) getSystemService(Context.USER_SERVICE);
        render();
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private TextView text(String value, float sp, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(sp);
        view.setTextColor(color);
        view.setLineSpacing(0, 1.18f);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private void render() {
        boolean multi = UserManager.supportsMultipleUsers();
        boolean restricted = userManager != null && userManager.hasUserRestriction(UserManager.DISALLOW_ADD_USER);
        boolean managedUsers = getPackageManager().hasSystemFeature(PackageManager.FEATURE_MANAGED_USERS);
        Intent creationIntent = null;
        boolean creationUi = false;
        try {
            creationIntent = UserManager.createUserCreationIntent("Seowoo", null, null, null);
            creationUi = creationIntent != null && creationIntent.resolveActivity(getPackageManager()) != null;
        } catch (Exception ignored) {}

        String grade;
        String summary;
        if (multi && !restricted) {
            grade = "지원 가능성 높음";
            summary = creationUi
                ? "Android가 다중 사용자를 지원하고 사용자 추가 UI도 확인됐어. 무초기화 보조사용자 방식 진행 가능성이 높아."
                : "Android가 다중 사용자를 지원해. ZUI에서 메뉴가 숨겨져 있어도 ADB 보조사용자 방식 진행 가능성이 높아.";
        } else if (restricted) {
            grade = "현재 정책에서 제한됨";
            summary = "현재 사용자에 '사용자 추가 금지' 정책이 걸려 있어. 계정이나 데이터를 지운 상태는 아니고, 정책 원인 확인이 필요해.";
        } else {
            grade = "ZUI 숨김 여부 추가확인 필요";
            summary = "공개 Android API에서는 다중 사용자 지원을 확인하지 못했어. 다만 제조사 ROM은 사용자 전환 UI를 숨길 수 있어서 이 결과만으로 ADB 보조사용자까지 불가능하다고 단정하면 안 돼.";
        }

        reportText = "Y700 무초기화 지원여부 검사\n"
            + "판정: " + grade + "\n"
            + "모델: " + Build.MANUFACTURER + " " + Build.MODEL + "\n"
            + "Android: " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")\n"
            + "빌드: " + Build.DISPLAY + "\n"
            + "다중 사용자 API: " + (multi ? "지원" : "미확인") + "\n"
            + "사용자 추가 제한: " + (restricted ? "있음" : "없음") + "\n"
            + "사용자 추가 UI: " + (creationUi ? "있음" : "없음/숨김") + "\n"
            + "관리 프로필 기능: " + (managedUsers ? "있음" : "없음") + "\n"
            + "Fingerprint: " + Build.FINGERPRINT;

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(244, 249, 252));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(22), dp(28), dp(22), dp(34));
        scroll.addView(root, new ScrollView.LayoutParams(ScrollView.LayoutParams.MATCH_PARENT, ScrollView.LayoutParams.WRAP_CONTENT));

        TextView title = text("Y700 무초기화 검사", 28, Color.rgb(17, 48, 62), true);
        root.addView(title);

        TextView sub = text("이 앱은 조회만 해. Google 계정, 게임 데이터, 사용자, 설정을 삭제하거나 변경하지 않아.", 16, Color.rgb(74, 97, 108), false);
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        subLp.topMargin = dp(8);
        root.addView(sub, subLp);

        TextView verdict = text(grade, 24, Color.rgb(13, 103, 94), true);
        verdict.setGravity(Gravity.CENTER);
        verdict.setPadding(dp(18), dp(20), dp(18), dp(20));
        verdict.setBackgroundColor(Color.WHITE);
        LinearLayout.LayoutParams verdictLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        verdictLp.topMargin = dp(24);
        root.addView(verdict, verdictLp);

        TextView summaryView = text(summary, 17, Color.rgb(33, 61, 72), false);
        summaryView.setPadding(dp(4), dp(16), dp(4), dp(10));
        root.addView(summaryView);

        TextView detailTitle = text("진단 결과", 19, Color.rgb(17, 48, 62), true);
        LinearLayout.LayoutParams dtLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        dtLp.topMargin = dp(12);
        root.addView(detailTitle, dtLp);

        TextView details = text(reportText, 14, Color.rgb(45, 66, 75), false);
        details.setTextIsSelectable(true);
        details.setPadding(dp(14), dp(14), dp(14), dp(14));
        details.setBackgroundColor(Color.WHITE);
        LinearLayout.LayoutParams detailsLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        detailsLp.topMargin = dp(8);
        root.addView(details, detailsLp);

        Button copy = new Button(this);
        copy.setText("결과 복사");
        copy.setTextSize(16);
        copy.setAllCaps(false);
        copy.setOnClickListener(v -> copyReport());
        LinearLayout.LayoutParams buttonLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(56));
        buttonLp.topMargin = dp(18);
        root.addView(copy, buttonLp);

        if (creationUi && !restricted) {
            final Intent finalCreationIntent = creationIntent;
            Button open = new Button(this);
            open.setText("Android 사용자 추가 화면만 열어보기");
            open.setTextSize(16);
            open.setAllCaps(false);
            open.setOnClickListener(v -> {
                try {
                    startActivity(finalCreationIntent);
                } catch (Exception e) {
                    Toast.makeText(this, "이 ZUI에서는 사용자 추가 화면을 열지 못했어.", Toast.LENGTH_LONG).show();
                }
            });
            LinearLayout.LayoutParams openLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(56));
            openLp.topMargin = dp(10);
            root.addView(open, openLp);

            TextView note = text("위 버튼은 Android의 공식 사용자 추가 화면을 여는 것뿐이야. 실제 생성은 시스템 화면에서 네가 최종 확인해야 진행돼.", 13, Color.rgb(88, 102, 109), false);
            LinearLayout.LayoutParams noteLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            noteLp.topMargin = dp(6);
            root.addView(note, noteLp);
        }

        setContentView(scroll);
    }

    private void copyReport() {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null) {
            clipboard.setPrimaryClip(ClipData.newPlainText("Y700 diagnostic", reportText));
            Toast.makeText(this, "진단 결과를 복사했어. 이 채팅에 붙여넣어줘.", Toast.LENGTH_LONG).show();
        }
    }
}
