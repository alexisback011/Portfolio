package com.alex.admin;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.util.AttributeSet;
import android.util.TypedValue;
import android.view.View;

public class StrokeText extends View {

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private String text = "";
    private int textColor = 0xFFFF0059;
    private float textSizeSp = 30f;

    public StrokeText(Context c) { super(c); init(); }
    public StrokeText(Context c, AttributeSet a) { super(c, a); init(); }

    private float px(float sp) {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_SP, sp, getResources().getDisplayMetrics());
    }

    private void init() {
        paint.setStyle(Paint.Style.STROKE);
        paint.setTypeface(Typeface.create("sans-serif-condensed", Typeface.BOLD));
        paint.setLetterSpacing(0.05f);
        paint.setColor(textColor);
    }

    public void setText(String s) {
        text = s == null ? "" : s;
        requestLayout();
        invalidate();
    }

    public void setTextColor(int color) {
        textColor = color;
        paint.setColor(color);
        invalidate();
    }

    public void setTextSizeSp(float sp) {
        textSizeSp = sp;
        paint.setTextSize(px(sp));
        requestLayout();
        invalidate();
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        float size = px(textSizeSp);
        paint.setTextSize(size);
        paint.setStrokeWidth(Math.max(2f, size / 14f));
        float w = paint.measureText(text) + paint.getStrokeWidth() * 2;
        float h = (paint.descent() - paint.ascent()) + paint.getStrokeWidth() * 2;
        int wSpec = MeasureSpec.getMode(widthMeasureSpec) == MeasureSpec.AT_MOST
                ? MeasureSpec.makeMeasureSpec((int) w, MeasureSpec.EXACTLY)
                : widthMeasureSpec;
        int hSpec = MeasureSpec.getMode(heightMeasureSpec) == MeasureSpec.AT_MOST
                ? MeasureSpec.makeMeasureSpec((int) h, MeasureSpec.EXACTLY)
                : heightMeasureSpec;
        setMeasuredDimension(MeasureSpec.getSize(wSpec), MeasureSpec.getSize(hSpec));
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        if (text.length() == 0) return;
        float size = px(textSizeSp);
        paint.setTextSize(size);
        paint.setStrokeWidth(Math.max(2f, size / 14f));
        float baseline = (getHeight() + (paint.descent() - paint.ascent()) / 2f) - paint.descent();
        canvas.drawText(text, paint.getStrokeWidth(), baseline, paint);
    }
}
