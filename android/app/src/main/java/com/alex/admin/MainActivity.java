package com.alex.admin;

import android.animation.AnimatorInflater;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.IntentSender;
import android.content.pm.PackageInstaller;
import android.view.animation.PathInterpolator;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AnimationUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends Activity {

    private static final String APP_VERSION = "1.0.6";
    private static final String[] TAB_SUB = {
        "Registered profiles",
        "Contact form inbox",
        "Viewer reviews",
        "Login records",
        "OTP codes"
    };
    private static final String[] TAB_EMPTY = {
        "No registered users yet.",
        "No messages yet.",
        "No reviews yet.",
        "No login records yet.",
        "No OTP codes yet."
    };

    private View loginRoot;
    private View mainRoot;
    private EditText emailInput;
    private EditText passwordInput;
    private Button loginBtn;
    private TextView loginErr;

    private TextView title;
    private TextView tabSub;
    private ScrollView scroll;
    private LinearLayout list;
    private ProgressBar loading;
    private TextView empty;
    private Button[] tabs;
    private Button refreshBtn;
    private boolean listAnimate = false;

    private int currentTab = 0;
    private View tabIndicator;
    private View liveDot;
    private View loginDot;
    private boolean pulsing = false;
    private final JSONArray[] cache = new JSONArray[5];
    private final boolean[] loaded = new boolean[5];
    private final Set<String> expanded = new HashSet<String>();

    private final Handler handler = new Handler(Looper.getMainLooper());
    private static final String INSTALL_ACTION = "com.alex.admin.INSTALL_RESULT";
    private boolean updateInProgress = false;
    private final BroadcastReceiver installReceiver = new BroadcastReceiver() {
        @Override
        @SuppressWarnings("deprecation")
        public void onReceive(Context context, Intent intent) {
            int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999);
            if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                Intent confirm = Build.VERSION.SDK_INT >= 33
                    ? (Intent) intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class)
                    : intent.getParcelableExtra(Intent.EXTRA_INTENT);
                if (confirm != null) {
                    confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    try { startActivity(confirm); }
                    catch (Exception e) { toast("Enable installs from this app, then reopen.", true); }
                }
            } else if (status == PackageInstaller.STATUS_SUCCESS) {
                toast("Update installed.", false);
                handler.postDelayed(new Runnable() {
                    @Override
                    public void run() { android.os.Process.killProcess(android.os.Process.myPid()); }
                }, 700);
            } else {
                toast("Update install failed.", true);
            }
        }
    };
    private final Runnable autoRefresh = new Runnable() {
        @Override
        public void run() {
            if (mainRoot != null && mainRoot.getVisibility() == View.VISIBLE) {
                load(currentTab, false);
            }
            handler.postDelayed(this, 15000);
        }
    };

    private final Runnable pulseLoop = new Runnable() {
        private boolean on = true;
        @Override
        public void run() {
            if (!pulsing) return;
            on = !on;
            float a = on ? 1f : 0.12f;
            if (liveDot != null) liveDot.setAlpha(a);
            if (loginDot != null) loginDot.setAlpha(a);
            handler.postDelayed(this, 480);
        }
    };

    private final Runnable autoGlitch = new Runnable() {
        @Override
        public void run() {
            if (title == null || mainRoot == null || mainRoot.getVisibility() != View.VISIBLE) return;
            title.setTextColor(color(R.color.primary));
            title.setShadowLayer(dp(4), -dp(1), 0, color(R.color.secondary));
            title.animate().translationXBy(dp(3)).setDuration(45).withEndAction(new Runnable() {
                @Override
                public void run() {
                    title.animate().translationX(0f).setDuration(70).start();
                }
            }).start();
            handler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    title.setTextColor(color(R.color.fg));
                    title.setShadowLayer(0, 0, 0, 0);
                }
            }, 300);
            handler.postDelayed(this, 4200);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setBackgroundColor(color(R.color.bg));
        getWindow().setStatusBarColor(color(R.color.bg));
        getWindow().setNavigationBarColor(color(R.color.bg));

        FrameLayout root = new FrameLayout(this);
        GridBg grid = new GridBg(this);
        grid.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        root.addView(grid);
        GradientBg gradient = new GradientBg(this);
        gradient.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        root.addView(gradient);
        loginRoot = getLayoutInflater().inflate(R.layout.login, root, false);
        mainRoot = getLayoutInflater().inflate(R.layout.activity_main, root, false);
        root.addView(loginRoot);
        root.addView(mainRoot);
        mainRoot.setVisibility(View.GONE);
        setContentView(root);
        applyTouchFeedback((ViewGroup) loginRoot);
        applyTouchFeedback((ViewGroup) mainRoot);

        emailInput = (EditText) loginRoot.findViewById(R.id.email);
        passwordInput = (EditText) loginRoot.findViewById(R.id.password);
        loginBtn = (Button) loginRoot.findViewById(R.id.loginBtn);
        loginErr = (TextView) loginRoot.findViewById(R.id.loginErr);

        title = (TextView) mainRoot.findViewById(R.id.title);
        tabSub = (TextView) mainRoot.findViewById(R.id.tabSub);
        scroll = (ScrollView) mainRoot.findViewById(R.id.scroll);
        list = (LinearLayout) mainRoot.findViewById(R.id.list);
        loading = (ProgressBar) mainRoot.findViewById(R.id.loading);
        empty = (TextView) mainRoot.findViewById(R.id.empty);

        tabs = new Button[] {
            (Button) mainRoot.findViewById(R.id.tabProfiles),
            (Button) mainRoot.findViewById(R.id.tabMessages),
            (Button) mainRoot.findViewById(R.id.tabReviews),
            (Button) mainRoot.findViewById(R.id.tabLogins),
            (Button) mainRoot.findViewById(R.id.tabOtps)
        };
        for (int i = 0; i < tabs.length; i++) {
            final int idx = i;
            tabs[i].setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { selectTab(idx); }
            });
        }
        tabIndicator = mainRoot.findViewById(R.id.tabIndicator);
        setupTabIndicator();

        refreshBtn = (Button) mainRoot.findViewById(R.id.refreshBtn);
        refreshBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) { refresh(); }
        });
        ((Button) mainRoot.findViewById(R.id.logoutBtn)).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) { doLogout(); }
        });

        liveDot = mainRoot.findViewById(R.id.liveDot);
        loginDot = loginRoot.findViewById(R.id.loginStatusDot);
        MarqueeView marquee = (MarqueeView) mainRoot.findViewById(R.id.marquee);
        if (marquee != null) {
            marquee.setText("PROFILES MESSAGES REVIEWS LOGINS OTP ADMIN");
        }
        glitch((TextView) loginRoot.findViewById(R.id.loginTitle));
        pulsing = true;
        handler.post(pulseLoop);

        loginBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) { doLogin(); }
        });

        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(installReceiver, new IntentFilter(INSTALL_ACTION), Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(installReceiver, new IntentFilter(INSTALL_ACTION));
        }
        Api.init(getApplicationContext());
        checkSession();
        animateScreenIn();
        checkUpdate();
    }

    private void animateScreenIn() {
        animateTitle();
        loginRoot.setAlpha(0f);
        loginRoot.setTranslationY(dp(18));
        loginRoot.animate().alpha(1f).translationY(0f).setDuration(450).setStartDelay(80).start();
    }

    private void animateTitle() {
        TextView lt = (TextView) loginRoot.findViewById(R.id.loginTitle);
        if (lt != null) {
            lt.setText("ALEX");
            revealLine(lt, 140);
        }
        TextView ls = (TextView) loginRoot.findViewById(R.id.loginStroke);
        if (ls != null) {
            ls.setText(".");
            ls.setTextColor(color(R.color.primary));
            revealLine(ls, 320);
        }
    }

    private void revealLine(final View v, final long delay) {
        v.post(new Runnable() {
            @Override
            public void run() {
                v.setTranslationY(v.getHeight() + dp(8));
                v.setAlpha(0f);
                v.animate().translationY(0f).alpha(1f).setDuration(850)
                    .setStartDelay(delay)
                    .setInterpolator(new PathInterpolator(0.85f, 0f, 0.15f, 1f)).start();
            }
        });
    }

    private void glitch(final TextView tv) {
        if (tv == null) return;
        tv.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, android.view.MotionEvent e) {
                if (e.getAction() == android.view.MotionEvent.ACTION_DOWN) {
                    tv.setTextColor(color(R.color.primary));
                    tv.setShadowLayer(dp(4), -dp(1), 0, color(R.color.secondary));
                } else if (e.getAction() == android.view.MotionEvent.ACTION_UP
                        || e.getAction() == android.view.MotionEvent.ACTION_CANCEL) {
                    tv.setTextColor(color(R.color.fg));
                    tv.setShadowLayer(0, 0, 0, 0);
                }
                return false;
            }
        });
    }

    /* ---------- auth ---------- */

    private void checkSession() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject me = Api.me();
                    if (me.optString("role").equals("admin")) {
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() { showMain(); }
                        });
                    }
                } catch (Exception ignored) {}
            }
        }).start();
    }

    private void doLogin() {
        final String email = emailInput.getText().toString().trim();
        final String password = passwordInput.getText().toString();
        if (email.length() == 0 || password.length() == 0) {
            setLoginError("Enter email and password.");
            return;
        }
        loginBtn.setEnabled(false);
        loginBtn.setText("SIGNING IN...");
        loginErr.setVisibility(View.INVISIBLE);
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject res = Api.login(email, password);
                    final String role = res.optString("role");
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            loginBtn.setEnabled(true);
                            loginBtn.setText("SIGN IN");
                            if (role.equals("admin")) {
                                showMain();
                            } else {
                                setLoginError("This account is not an admin.");
                            }
                        }
                    });
                } catch (final Exception e) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            loginBtn.setEnabled(true);
                            loginBtn.setText("SIGN IN");
                            setLoginError(e.getMessage() == null ? "Login failed." : e.getMessage());
                        }
                    });
                }
            }
        }).start();
    }

    private void setLoginError(String msg) {
        loginErr.setText(msg);
        loginErr.setVisibility(View.VISIBLE);
        loginRoot.clearAnimation();
        loginRoot.startAnimation(AnimationUtils.loadAnimation(this, R.anim.shake));
    }

    private void doLogout() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try { Api.logout(); } catch (Exception ignored) {}
                Api.clearCookies();
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() { showLogin(); }
                });
            }
        }).start();
    }

    private void showLogin() {
        handler.removeCallbacks(autoGlitch);
        title.setTextColor(color(R.color.fg));
        title.setShadowLayer(0, 0, 0, 0);
        loginRoot.setAlpha(0f);
        loginRoot.setVisibility(View.VISIBLE);
        mainRoot.setVisibility(View.GONE);
        passwordInput.setText("");
        animateTitle();
        loginRoot.animate().alpha(1f).setDuration(320).start();
        Toast.makeText(this, "Session expired. Sign in again.", Toast.LENGTH_SHORT).show();
    }

    private void showMain() {
        loginRoot.setVisibility(View.GONE);
        mainRoot.setAlpha(0f);
        mainRoot.setVisibility(View.VISIBLE);
        mainRoot.animate().alpha(1f).setDuration(400).start();
        title.setText("Alex");
        title.setShadowLayer(0, 0, 0, 0);
        title.setTextColor(color(R.color.fg));
        handler.removeCallbacks(autoGlitch);
        handler.postDelayed(autoGlitch, 1600);
        selectTab(currentTab);
        handler.removeCallbacks(autoRefresh);
        handler.postDelayed(autoRefresh, 15000);
    }

    /* ---------- tabs ---------- */

    private void selectTab(int tab) {
        currentTab = tab;
        for (int i = 0; i < tabs.length; i++) {
            tabs[i].setSelected(i == tab);
            if (i == tab) {
                tabs[i].setScaleX(0.85f);
                tabs[i].setScaleY(0.85f);
                tabs[i].animate().scaleX(1f).scaleY(1f).setDuration(240)
                    .setInterpolator(new android.view.animation.OvershootInterpolator()).start();
            }
        }
        tabSub.setText(TAB_SUB[tab] + " \u00b7 syncs every 15s");
        tabSub.startAnimation(AnimationUtils.loadAnimation(this, R.anim.fade_in));
        if (loaded[tab]) {
            render(tab, true);
        } else {
            showBusy();
        }
        animateTabIndicator(tab);
        load(tab, true);
    }

    private void setupTabIndicator() {
        if (tabIndicator == null) return;
        tabIndicator.post(new Runnable() {
            @Override
            public void run() {
                if (tabs[0].getWidth() <= 0) return;
                FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) tabIndicator.getLayoutParams();
                lp.width = tabs[0].getWidth();
                lp.height = tabs[0].getHeight();
                tabIndicator.setLayoutParams(lp);
                tabIndicator.setX(barLeft() + tabs[0].getLeft());
                tabIndicator.setAlpha(0f);
                tabIndicator.setVisibility(View.VISIBLE);
                tabIndicator.animate().alpha(1f).setDuration(300).start();
            }
        });
    }

    private void animateTabIndicator(final int tab) {
        if (tabIndicator == null) return;
        tabIndicator.post(new Runnable() {
            @Override
            public void run() {
                if (tabs[tab].getWidth() <= 0) return;
                int left = barLeft() + tabs[tab].getLeft();
                int w = tabs[tab].getWidth();
                if (tabIndicator.getWidth() != w) {
                    FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) tabIndicator.getLayoutParams();
                    lp.width = w;
                    lp.height = tabs[tab].getHeight();
                    tabIndicator.setLayoutParams(lp);
                }
                if (tabIndicator.getVisibility() != View.VISIBLE) {
                    tabIndicator.setX(left);
                    tabIndicator.setVisibility(View.VISIBLE);
                }
                tabIndicator.animate().x(left).setDuration(320)
                    .setInterpolator(new android.view.animation.OvershootInterpolator(1.15f)).start();
            }
        });
    }

    private int barLeft() {
        if (tabs[0] == null) return 0;
        View bar = (View) tabs[0].getParent();
        return bar == null ? 0 : bar.getLeft();
    }

    private void showBusy() {
        loading.setVisibility(View.VISIBLE);
        empty.setVisibility(View.GONE);
        list.removeAllViews();
    }

    private void load(final int tab, final boolean animate) {
        if (animate && !loaded[tab]) showBusy();
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    final JSONArray a;
                    switch (tab) {
                        case 0: a = Api.users(); break;
                        case 1: a = Api.messages(); break;
                        case 2: a = Api.reviews(); break;
                        case 3: a = Api.logins(); break;
                        default: a = Api.otps(); break;
                    }
                    final String oldStr = cache[tab] == null ? null : cache[tab].toString();
                    cache[tab] = a;
                    loaded[tab] = true;
                    final boolean changed = oldStr == null || !oldStr.equals(a.toString());
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            if (currentTab == tab && changed) render(tab, animate);
                        }
                    });
                } catch (final Api.ApiException e) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            if (e.status == 401) {
                                showLogin();
                            } else if (currentTab == tab) {
                                tabSub.setText("Error: " + e.getMessage());
                                toast(e.getMessage(), true);
                            }
                        }
                    });
                } catch (final Exception e) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            if (currentTab == tab) {
                                if (loaded[tab]) {
                                    toast("Network error", true);
                                } else {
                                    tabSub.setText("Network error \u2014 tap Refresh");
                                }
                            }
                        }
                    });
                }
            }
        }).start();
    }

    /* ---------- render ---------- */

    private void render(int tab, boolean animate) {
        loading.setVisibility(View.GONE);
        final int savedY = animate ? 0 : scroll.getScrollY();
        list.removeAllViews();
        listAnimate = animate;
        JSONArray a = cache[tab];
        if (a == null || a.length() == 0) {
            empty.setText(TAB_EMPTY[tab]);
            empty.setVisibility(View.VISIBLE);
            if (animate) {
                empty.startAnimation(AnimationUtils.loadAnimation(this, R.anim.grow));
            }
            return;
        }
        empty.setVisibility(View.GONE);
        switch (tab) {
            case 0: renderUsers(a); break;
            case 1: renderMessages(a); break;
            case 2: renderReviews(a); break;
            case 3: renderLogins(a); break;
            default: renderOtps(a); break;
        }
        listAnimate = false;
        if (animate) {
            scroll.setAlpha(0.7f);
            scroll.setTranslationY(dp(14));
            scroll.animate().alpha(1f).translationY(0f).setDuration(300)
                .setInterpolator(new android.view.animation.DecelerateInterpolator()).start();
            scroll.post(new Runnable() {
                @Override
                public void run() { scroll.fullScroll(View.FOCUS_UP); }
            });
        } else {
            final int y = savedY;
            scroll.post(new Runnable() {
                @Override
                public void run() { scroll.setScrollY(y); }
            });
        }
    }

    private void renderUsers(JSONArray a) {
        for (int i = 0; i < a.length(); i++) {
            final JSONObject u = a.optJSONObject(i);
            if (u == null) continue;
            View v = getLayoutInflater().inflate(R.layout.item_profile, list, false);
            TextView pAvatar = (TextView) v.findViewById(R.id.pAvatar);
            TextView pName = (TextView) v.findViewById(R.id.pName);
            TextView pRole = (TextView) v.findViewById(R.id.pRole);
            TextView pEmail = (TextView) v.findViewById(R.id.pEmail);
            TextView pDate = (TextView) v.findViewById(R.id.pDate);
            TextView pId = (TextView) v.findViewById(R.id.pId);
            TextView pHash = (TextView) v.findViewById(R.id.pHash);
            TextView pLogins = (TextView) v.findViewById(R.id.pLogins);
            Button pAction = (Button) v.findViewById(R.id.pAction);
            Button pDelete = (Button) v.findViewById(R.id.pDelete);

            final String id = u.optString("id");
            final String name = u.optString("name");
            final boolean admin = u.optString("role").equals("admin");
            final boolean banned = u.optBoolean("is_banned");

            pName.setText(name);
            avatar(pAvatar, name, u.optString("email"));
            pEmail.setText(u.optString("email"));
            pDate.setText(fmt(u.optString("created_at")));
            pId.setText(u.optString("id"));
            pHash.setText(u.optString("password_hash"));
            pLogins.setText("logins " + u.optInt("login_count") + " \u00b7 last " + fmt(u.optString("last_login")));

            if (admin) {
                pRole.setText("ADMIN \u00b7 PROTECTED");
                pRole.setTextColor(color(R.color.black));
                pRole.setBackgroundResource(R.drawable.chip_admin);
                pAction.setVisibility(View.GONE);
                pDelete.setVisibility(View.GONE);
            } else if (banned) {
                pRole.setText("BANNED");
                pRole.setTextColor(color(R.color.danger));
                pRole.setBackgroundResource(R.drawable.chip_banned);
                pAction.setText("UNBAN");
                pAction.setTextColor(color(R.color.secondary));
                pAction.setBackgroundResource(R.drawable.btn_ghost);
                pAction.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) { doUnban(u, name); }
                });
                pDelete.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) { doDeleteUser(u, name); }
                });
            } else {
                pRole.setText(u.optString("role").toUpperCase());
                pRole.setTextColor(color(R.color.primary));
                pRole.setBackgroundResource(R.drawable.chip_user);
                pAction.setText("BAN");
                pAction.setTextColor(color(R.color.danger));
                pAction.setBackgroundResource(R.drawable.btn_danger);
                pAction.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) { doBan(u, name); }
                });
                pDelete.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) { doDeleteUser(u, name); }
                });
            }

            pIdCopy(v, R.id.pIdCopy, u.optString("id"), "User ID copied.");
            pIdCopy(v, R.id.pHashCopy, u.optString("password_hash"), "Hash copied.");

            final JSONArray logins = u.optJSONArray("logins");
            pLogins.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (expanded.contains(id)) expanded.remove(id); else expanded.add(id);
                    render(0, false);
                }
            });

            enterAnim(v, i);
            list.addView(v);
            if (expanded.contains(id) && logins != null && logins.length() > 0) {
                StringBuilder sb = new StringBuilder();
                for (int j = 0; j < logins.length(); j++) {
                    JSONObject l = logins.optJSONObject(j);
                    if (l == null) continue;
                    sb.append("\u25b8 ").append(opt(l, "ip_address", "unknown ip"));
                    if (!TextUtils.isEmpty(l.optString("device"))) sb.append(" \u00b7 ").append(l.optString("device"));
                    sb.append(" \u00b7 ").append(fmt(l.optString("created_at"))).append("\n");
                }
                TextView det = new TextView(this);
                det.setText(sb.toString().trim());
                det.setTextColor(color(R.color.muted));
                det.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9);
                det.setTypeface(android.graphics.Typeface.MONOSPACE);
                det.setPadding(dp(12), 0, dp(12), dp(12));
                ((LinearLayout) v).addView(det);
            }
        }
    }

    private void renderMessages(JSONArray a) {
        for (int i = 0; i < a.length(); i++) {
            final JSONObject m = a.optJSONObject(i);
            if (m == null) continue;
            View v = getLayoutInflater().inflate(R.layout.item_message, list, false);
            avatar((TextView) v.findViewById(R.id.mAvatar), m.optString("name"), m.optString("email"));
            ((TextView) v.findViewById(R.id.mName)).setText(m.optString("name"));
            ((TextView) v.findViewById(R.id.mEmail)).setText(m.optString("email"));
            ((TextView) v.findViewById(R.id.mDate)).setText(fmt(m.optString("created_at")));
            ((TextView) v.findViewById(R.id.mText)).setText(m.optString("message"));
            ((Button) v.findViewById(R.id.mDelete)).setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { doDeleteMessage(m); }
            });
            enterAnim(v, i);
            list.addView(v);
        }
    }

    private void renderReviews(JSONArray a) {
        for (int i = 0; i < a.length(); i++) {
            final JSONObject r = a.optJSONObject(i);
            if (r == null) continue;
            View v = getLayoutInflater().inflate(R.layout.item_review, list, false);
            avatar((TextView) v.findViewById(R.id.rAvatar), r.optString("name"), r.optString("email"));
            ((TextView) v.findViewById(R.id.rName)).setText(r.optString("name"));
            ((TextView) v.findViewById(R.id.rDate)).setText(fmt(r.optString("created_at")));
            ((TextView) v.findViewById(R.id.rStars)).setText(stars(r.optInt("rating")));
            ((TextView) v.findViewById(R.id.rText)).setText(r.optString("comment"));
            ((Button) v.findViewById(R.id.rDelete)).setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { doDeleteReview(r); }
            });
            enterAnim(v, i);
            list.addView(v);
        }
    }

    private void renderLogins(JSONArray a) {
        for (int i = 0; i < a.length(); i++) {
            JSONObject l = a.optJSONObject(i);
            if (l == null) continue;
            View v = getLayoutInflater().inflate(R.layout.item_login, list, false);
            avatar((TextView) v.findViewById(R.id.lAvatar), l.optString("email"), "IN");
            ((TextView) v.findViewById(R.id.lEmail)).setText(l.optString("email"));
            String meta = opt(l, "ip_address", "unknown ip");
            if (!TextUtils.isEmpty(l.optString("device"))) meta += " \u00b7 " + l.optString("device");
            ((TextView) v.findViewById(R.id.lMeta)).setText(meta);
            ((TextView) v.findViewById(R.id.lDate)).setText(fmt(l.optString("created_at")));
            ((TextView) v.findViewById(R.id.lUa)).setText(l.optString("user_agent"));
            v.findViewById(R.id.lDel).setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View vw) { doDeleteLogin(l); }
            });
            enterAnim(v, i);
            list.addView(v);
        }
    }

    private void renderOtps(JSONArray a) {
        long now = System.currentTimeMillis();
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            View v = getLayoutInflater().inflate(R.layout.item_otp, list, false);
            avatar((TextView) v.findViewById(R.id.oAvatar), o.optString("email"), "OTP");
            ((TextView) v.findViewById(R.id.oEmail)).setText(o.optString("email"));
            TextView status = (TextView) v.findViewById(R.id.oStatus);
            boolean used = o.optBoolean("used");
            boolean expired = parseMillis(o.optString("expires_at")) < now;
            if (used) {
                status.setText("USED");
                status.setTextColor(color(R.color.primary));
            } else if (expired) {
                status.setText("EXPIRED");
                status.setTextColor(color(R.color.danger));
            } else {
                status.setText("ACTIVE");
                status.setTextColor(color(R.color.secondary));
            }
            ((TextView) v.findViewById(R.id.oDate)).setText(fmt(o.optString("created_at")));
            ((TextView) v.findViewById(R.id.oHash)).setText(o.optString("code_hash"));
            ((TextView) v.findViewById(R.id.oMeta)).setText(
                "expires " + fmt(o.optString("expires_at")) + " \u00b7 attempts " + o.optInt("attempts"));
            pIdCopy(v, R.id.oHashCopy, o.optString("code_hash"), "OTP hash copied.");
            v.findViewById(R.id.oDel).setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View vw) { doDeleteOtp(o); }
            });
            enterAnim(v, i);
            list.addView(v);
        }
    }

    private void pIdCopy(View v, int id, final String text, final String label) {
        v.findViewById(id).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) { copy(text, label); }
        });
    }

    private void enterAnim(View v, int i) {
        try {
            v.setStateListAnimator(AnimatorInflater.loadStateListAnimator(this, R.animator.card_touch));
        } catch (Exception ignored) {}
        if (!listAnimate) return;
        v.setAlpha(0f);
        v.setScaleX(0.92f);
        v.setScaleY(0.92f);
        v.setTranslationY(dp(18));
        long delay = Math.min(i, 12) * 30L;
        v.animate().setStartDelay(delay).setDuration(360)
            .alpha(1f).scaleX(1f).scaleY(1f).translationY(0f)
            .setInterpolator(new android.view.animation.OvershootInterpolator(1.06f)).start();
    }

    private void refresh() {
        refreshBtn.animate().scaleX(0.82f).scaleY(0.82f).setDuration(120)
            .withEndAction(new Runnable() {
                @Override
                public void run() {
                    refreshBtn.animate().scaleX(1f).scaleY(1f).setDuration(280)
                        .setInterpolator(new android.view.animation.OvershootInterpolator(1.2f)).start();
                }
            }).start();
        load(currentTab, true);
    }

    private void applyTouchFeedback(ViewGroup root) {
        if (root == null) return;
        for (int i = 0; i < root.getChildCount(); i++) {
            View c = root.getChildAt(i);
            if (c instanceof Button) {
                try {
                    ((Button) c).setStateListAnimator(
                        AnimatorInflater.loadStateListAnimator(this, R.animator.btn_touch));
                } catch (Exception ignored) {}
            }
            if (c instanceof ViewGroup) applyTouchFeedback((ViewGroup) c);
        }
    }

    /* ---------- actions ---------- */

    private interface Op {
        void run() throws Exception;
    }

    private void doBan(final JSONObject u, final String name) {
        confirm("Ban " + name + "?", "They will be locked out immediately.", new Runnable() {
            @Override
            public void run() {
                mutate(new Op() {
                    @Override
                    public void run() throws Exception { Api.ban(u.optString("id")); }
                }, 0, name + " banned.");
            }
        });
    }

    private void doUnban(final JSONObject u, final String name) {
        confirm("Unban " + name + "?", "They will be able to sign in again.", new Runnable() {
            @Override
            public void run() {
                mutate(new Op() {
                    @Override
                    public void run() throws Exception { Api.unban(u.optString("id")); }
                }, 0, name + " unbanned.");
            }
        });
    }

    private void doDeleteUser(final JSONObject u, final String name) {
        confirm("Delete " + name + "?", "Their reviews and login history will be removed too.", new Runnable() {
            @Override
            public void run() {
                mutate(new Op() {
                    @Override
                    public void run() throws Exception { Api.deleteUser(u.optString("id")); }
                }, 0, name + " deleted.");
            }
        });
    }

    private void doDeleteMessage(final JSONObject m) {
        confirm("Delete message?", "This cannot be undone.", new Runnable() {
            @Override
            public void run() {
                mutate(new Op() {
                    @Override
                    public void run() throws Exception { Api.deleteMessage(m.optString("id")); }
                }, 1, "Message deleted.");
            }
        });
    }

    private void doDeleteReview(final JSONObject r) {
        confirm("Delete review?", "This cannot be undone.", new Runnable() {
            @Override
            public void run() {
                mutate(new Op() {
                    @Override
                    public void run() throws Exception { Api.deleteReview(r.optString("id")); }
                }, 2, "Review deleted.");
            }
        });
    }

    private void doDeleteLogin(final JSONObject l) {
        confirm("Delete login record?", "This cannot be undone.", new Runnable() {
            @Override
            public void run() {
                mutate(new Op() {
                    @Override
                    public void run() throws Exception { Api.deleteLogin(l.optInt("id")); }
                }, 3, "Login record deleted.");
            }
        });
    }

    private void doDeleteOtp(final JSONObject o) {
        confirm("Delete OTP record?", "This cannot be undone.", new Runnable() {
            @Override
            public void run() {
                mutate(new Op() {
                    @Override
                    public void run() throws Exception { Api.deleteOtp(o.optInt("id")); }
                }, 4, "OTP record deleted.");
            }
        });
    }

    private void mutate(final Op op, final int tab, final String doneMsg) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    op.run();
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            toast(doneMsg, false);
                            load(tab, true);
                        }
                    });
                } catch (final Exception e) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() { toast(e.getMessage() == null ? "Failed." : e.getMessage(), true); }
                    });
                }
            }
        }).start();
    }

    private void confirm(String title, String msg, final Runnable yes) {
        new AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(msg)
            .setPositiveButton("Yes", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface d, int w) { yes.run(); }
            })
            .setNegativeButton("Cancel", null)
            .show();
    }

    /* ---------- update check ---------- */

    private void checkUpdate() {
        if (updateInProgress) return;
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    final JSONObject v = Api.apkVersion();
                    final String version = v.optString("version");
                    final String apkUrl = v.optString("apk_url");
                    if (version.length() == 0 || version.equals(APP_VERSION) || apkUrl.length() == 0) return;
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() { updateDialog(version, apkUrl); }
                    });
                } catch (Exception ignored) {}
            }
        }).start();
    }

    private void updateDialog(final String version, final String apkUrl) {
        updateInProgress = true;
        final AlertDialog dlg = new AlertDialog.Builder(this)
            .setTitle("Update available")
            .setMessage("v" + APP_VERSION + " \u2192 v" + version + "\n\nDownloading automatically\u2026")
            .setCancelable(false)
            .show();
        new Thread(new Runnable() {
            @Override
            public void run() {
                final String err = downloadApk(apkUrl);
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try { dlg.dismiss(); } catch (Exception ignored) {}
                        if (err == null) {
                            installUpdate();
                        } else {
                            updateInProgress = false;
                            toast("Update failed: " + err, true);
                        }
                    }
                });
            }
        }).start();
    }

    private String downloadApk(String urlStr) {
        InputStream is = null;
        FileOutputStream fos = null;
        try {
            URL u = new URL(urlStr);
            HttpURLConnection c = (HttpURLConnection) u.openConnection();
            c.setConnectTimeout(15000);
            c.setReadTimeout(60000);
            c.setInstanceFollowRedirects(true);
            if (c.getResponseCode() != 200) return "HTTP " + c.getResponseCode();
            File out = new File(getCacheDir(), "update.apk");
            is = c.getInputStream();
            fos = new FileOutputStream(out);
            byte[] buf = new byte[8192];
            int n;
            long total = 0;
            while ((n = is.read(buf)) > 0) { fos.write(buf, 0, n); total += n; }
            if (total == 0) return "empty download";
            return null;
        } catch (Exception e) {
            return e.getMessage();
        } finally {
            try { if (is != null) is.close(); } catch (Exception ignored) {}
            try { if (fos != null) fos.close(); } catch (Exception ignored) {}
        }
    }

    private void installUpdate() {
        try {
            File apk = new File(getCacheDir(), "update.apk");
            PackageInstaller pi = getPackageManager().getPackageInstaller();
            PackageInstaller.SessionParams params =
                new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
            params.setAppPackageName(getPackageName());
            int id = pi.createSession(params);
            PackageInstaller.Session session = pi.openSession(id);
            OutputStream os = session.openWrite("update.apk", 0, -1);
            FileInputStream fis = new FileInputStream(apk);
            byte[] buf = new byte[65536];
            int n;
            while ((n = fis.read(buf)) > 0) os.write(buf, 0, n);
            session.fsync(os);
            os.close();
            fis.close();
            session.commit(pendingSender());
            session.close();
        } catch (Exception e) {
            updateInProgress = false;
            toast("Install failed: " + (e.getMessage() == null ? "unknown" : e.getMessage()), true);
        }
    }

    private IntentSender pendingSender() {
        return PendingIntent.getBroadcast(this, 1, new Intent(INSTALL_ACTION),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE).getIntentSender();
    }

    /* ---------- helpers ---------- */

    private void copy(String text, String label) {
        try {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setPrimaryClip(ClipData.newPlainText("AlexAdmin", text));
            toast(label, false);
        } catch (Exception e) {
            toast("Could not copy.", true);
        }
    }

    private void toast(String msg, boolean isError) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private int color(int res) {
        return getResources().getColor(res, getTheme());
    }

    private int avatarBg(String seed) {
        int h = Math.abs((seed == null ? "" : seed).hashCode());
        return new int[] {
            R.drawable.avatar_grad_1, R.drawable.avatar_grad_2, R.drawable.avatar_grad_3,
            R.drawable.avatar_grad_4, R.drawable.avatar_grad_5
        }[h % 5];
    }

    private void avatar(TextView tv, String name, String fallback) {
        String s = (name == null || name.trim().length() == 0) ? fallback : name;
        s = s.trim();
        String initials;
        int sp = s.indexOf(' ');
        if (sp > 0 && sp + 1 < s.length()) {
            initials = String.valueOf(Character.toUpperCase(s.charAt(0))) +
                       Character.toUpperCase(s.charAt(sp + 1));
        } else {
            initials = String.valueOf(Character.toUpperCase(s.charAt(0)));
        }
        tv.setText(initials);
        tv.setTextColor(color(R.color.primary));
        tv.setBackgroundResource(avatarBg(s));
    }

    private String stars(int n) {
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= 5; i++) sb.append(i <= n ? "\u2605" : "\u2606");
        return sb.toString();
    }

    private static String opt(JSONObject o, String key, String def) {
        String s = o.optString(key);
        return (s == null || s.length() == 0) ? def : s;
    }

    private static final SimpleDateFormat ISO_UTC = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US);
    private static final SimpleDateFormat OUT = new SimpleDateFormat("MMM d, HH:mm", Locale.US);

    private static String fmt(String iso) {
        if (iso == null || iso.length() == 0) return "\u2014";
        String s = iso.replace('T', ' ');
        int dot = s.indexOf('.');
        if (dot > 0) s = s.substring(0, dot);
        if (s.endsWith("Z")) s = s.substring(0, s.length() - 1);
        s = s.trim();
        try {
            ISO_UTC.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            Date d = ISO_UTC.parse(s);
            return OUT.format(d);
        } catch (Exception e) {
            return iso;
        }
    }

    private static long parseMillis(String iso) {
        try {
            String s = iso.replace('T', ' ');
            int dot = s.indexOf('.');
            if (dot > 0) s = s.substring(0, dot);
            if (s.endsWith("Z")) s = s.substring(0, s.length() - 1);
            ISO_UTC.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            Date d = ISO_UTC.parse(s.trim());
            return d.getTime();
        } catch (Exception e) {
            return Long.MAX_VALUE;
        }
    }

    @Override
    protected void onDestroy() {
        pulsing = false;
        handler.removeCallbacks(autoRefresh);
        try { unregisterReceiver(installReceiver); } catch (Exception ignored) {}
        super.onDestroy();
    }
}
