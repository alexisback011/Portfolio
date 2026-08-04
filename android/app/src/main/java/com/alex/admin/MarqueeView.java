package com.alex.admin;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.os.Handler;
import android.os.Looper;
import android.util.AttributeSet;
import android.util.TypedValue;
import android.view.View;

public class MarqueeView extends View {

    private final Paint wordPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint sepPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Handler handler = new Handler(Looper.getMainLooper());
    private String[] words = { "ADMIN", "CREATOR", "DEVELOPER" };
    private float offset = 0f;
    private boolean running = false;

    private final Runnable loop = new Runnable() {
        @Override
        public void run() {
            if (!running) return;
            offset += getResources().getDisplayMetrics().density * 1.2f;
            invalidate();
            handler.postDelayed(this, 16);
        }
    };

    public MarqueeView(Context c) { super(c); init(); }
    public MarqueeView(Context c, AttributeSet a) { super(c, a); init(); }

    private void init() {
        wordPaint.setStyle(Paint.Style.STROKE);
        wordPaint.setStrokeWidth(2f);
        wordPaint.setTypeface(Typeface.create("sans-serif-condensed", Typeface.BOLD));
        wordPaint.setColor(0xFFFAFAFA);
        sepPaint.setTypeface(Typeface.create("sans-serif-condensed", Typeface.BOLD));
        sepPaint.setColor(getResources().getColor(R.color.primary, getContext().getTheme()));
        setLayerType(View.LAYER_TYPE_SOFTWARE, null);
    }

    public void setText(String text) {
        words = (text == null || text.trim().length() == 0)
                ? new String[] { "ADMIN" }
                : text.trim().split("\\s+");
        invalidate();
    }

    private float textSize() {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_SP, 26f, getResources().getDisplayMetrics());
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        float size = textSize();
        wordPaint.setTextSize(size);
        float h = (wordPaint.descent() - wordPaint.ascent()) + 8f * getResources().getDisplayMetrics().density;
        setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), Math.round(h));
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int w = getWidth();
        if (w == 0) return;
        float size = textSize();
        wordPaint.setTextSize(size);
        sepPaint.setTextSize(size * 0.8f);
        float gap = 22f * getResources().getDisplayMetrics().density;
        float baseline = (getHeight() + (wordPaint.descent() - wordPaint.ascent()) / 2f) - wordPaint.descent();

        float unit = 0f;
        for (int i = 0; i < words.length; i++) {
            unit += wordPaint.measureText(words[i]) + gap + sepPaint.measureText("\u2605") + gap;
        }
        if (unit <= 0) return;
        float o = offset % unit;
        if (o > 0) o -= unit;
        float x = o;
        while (x < w) {
            for (int i = 0; i < words.length; i++) {
                canvas.drawText(words[i], x, baseline, wordPaint);
                x += wordPaint.measureText(words[i]) + gap;
                canvas.drawText("\u2605", x, baseline, sepPaint);
                x += sepPaint.measureText("\u2605") + gap;
            }
        }
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
