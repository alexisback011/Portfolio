package com.alex.admin;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.animation.PathInterpolator;
import android.widget.LinearLayout;
import android.widget.TextView;

public class SplashActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.splash);
        getWindow().getDecorView().setBackgroundColor(0xFF0A0A0A);

        final TextView mark = (TextView) findViewById(R.id.splashA);
        final TextView dot = (TextView) findViewById(R.id.splashDot);
        final LinearLayout block = (LinearLayout) findViewById(R.id.splashBlock);

        mark.setAlpha(0f);
        dot.setAlpha(0f);

        final ValueAnimator ls = ValueAnimator.ofFloat(0.5f, 0.1f);
        ls.setDuration(700);
        ls.setInterpolator(new PathInterpolator(0.85f, 0f, 0.15f, 1f));
        ls.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator a) {
                float v = (Float) a.getAnimatedValue();
                mark.setLetterSpacing(v);
                mark.setAlpha(a.getAnimatedFraction());
                dot.setAlpha(a.getAnimatedFraction());
            }
        });
        ls.start();

        block.postDelayed(new Runnable() {
            @Override
            public void run() {
                block.animate().translationY(-dp(40)).alpha(0f).setDuration(420)
                    .setInterpolator(new PathInterpolator(0.85f, 0f, 0.15f, 1f))
                    .withEndAction(new Runnable() {
                        @Override
                        public void run() {
                            startActivity(new Intent(SplashActivity.this, MainActivity.class));
                            finish();
                            overridePendingTransition(0, 0);
                        }
                    }).start();
            }
        }, 1350);
    }

    private int dp(int v) {
        return Math.round(getResources().getDisplayMetrics().density * v);
    }
}
