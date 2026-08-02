package com.alex.admin;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Shader;
import android.os.Handler;
import android.os.Looper;
import android.util.AttributeSet;
import android.view.View;

public class GradientBg extends View {

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Handler handler = new Handler(Looper.getMainLooper());
    private float angle = 0f;
    private boolean running = false;

    private final Runnable loop = new Runnable() {
        @Override
        public void run() {
            if (!running) return;
            angle = (angle + 0.4f) % 360f;
            invalidate();
            handler.postDelayed(this, 40);
        }
    };

    public GradientBg(Context c) { super(c); }
    public GradientBg(Context c, AttributeSet a) { super(c, a); }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int w = canvas.getWidth();
        int h = canvas.getHeight();
        if (w == 0 || h == 0) return;
        int r = Math.max(w, h);
        int pink = withAlpha(getResources().getColor(R.color.primary, getContext().getTheme()));
        paint.setShader(new LinearGradient(0f, 0f, w, h,
            new int[] { pink, 0x00000000, pink },
            null, Shader.TileMode.CLAMP));
        canvas.save();
        canvas.rotate(angle, w / 2f, h / 2f);
        canvas.drawRect(-r, -r, w + r, h + r, paint);
        canvas.restore();
    }

    private static int withAlpha(int color) {
        return (0x22 << 24) | (color & 0xFFFFFF);
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        running = true;
        handler.post(loop);
    }

    @Override
    protected void onDetachedFromWindow() {
        running = false;
        handler.removeCallbacks(loop);
        super.onDetachedFromWindow();
    }
}
