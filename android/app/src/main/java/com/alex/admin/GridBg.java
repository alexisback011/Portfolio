package com.alex.admin;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.util.AttributeSet;
import android.view.View;

public class GridBg extends View {

    private final Paint paint = new Paint();

    public GridBg(Context c) { super(c); }
    public GridBg(Context c, AttributeSet a) { super(c, a); }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int w = canvas.getWidth();
        int h = canvas.getHeight();
        if (w == 0 || h == 0) return;
        paint.setStrokeWidth(1f);
        paint.setColor(0x0AFFFFFF);
        int step = Math.round(60f * getResources().getDisplayMetrics().density);
        if (step < 30) step = 30;
        for (int x = 0; x <= w; x += step) canvas.drawLine(x, 0, x, h, paint);
        for (int y = 0; y <= h; y += step) canvas.drawLine(0, y, w, y, paint);
    }
}
