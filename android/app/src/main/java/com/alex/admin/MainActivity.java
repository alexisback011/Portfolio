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
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AnimationUtils;
import android.view.animation.PathInterpolator;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.ImageView;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends Activity {

    private static final String APP_VERSION = "1.0.8";

    private static final int PAGE_OVERVIEW = 0;
    private static final int PAGE_USERS = 1;
    private static final int PAGE_MESSAGES = 2;
    private static final int PAGE_REVIEWS = 3;
    private static final int PAGE_LOGINS = 4;
    private static final int PAGE_OTPS = 5;
    private static final int PAGE_COUNT = 6;

    private static final int[] PAGE_ICONS = {
        R.drawable.ic_layout_dashboard,
        R.drawable.ic_users,
        R.drawable.ic_mail,
        R.drawable.ic_star,
        R.drawable.ic_history,
        R.drawable.ic_key_round
    };
    private static final int[] NAV_ITEM_IDS = {
        R.id.navOverview, R.id.navUsers, R.id.navMessages,
        R.id.navReviews, R.id.navLogins, R.id.navOtps
    };
    private static final int[] NAV_ICON_IDS = {
        R.id.navIconOverview, R.id.navIconUsers, R.id.navIconMessages,
        R.id.navIconReviews, R.id.navIconLogins, R.id.navIconOtps
    };
    private static final int[] NAV_ACCENT_IDS = {
        R.id.navAccentOverview, R.id.navAccentUsers, R.id.navAccentMessages,
        R.id.navAccentReviews, R.id.navAccentLogins, R.id.navAccentOtps
    };
    private static final int[] NAV_LABEL_IDS = {
        R.id.navLabelOverview, R.id.navLabelUsers, R.id.navLabelMessages,
        R.id.navLabelReviews, R.id.navLabelLogins, R.id.navLabelOtps
    };
    private static final String[] EMPTY_TITLE = {
        "No activity yet",
        "No registered users",
        "Inbox empty",
        "No reviews yet",
        "No login records",
        "No OTP records"
    };
    private static final String[] EMPTY_DESC = {
        "Accounts, reviews, messages and codes appear here once the site sees traffic.",
        "Signups appear here the moment someone creates an account.",
        "No messages yet. Submissions from the contact form appear here.",
        "Viewer comments appear here as soon as someone posts one.",
        "Sign-ins appear here in real time.",
        "Sign-up and password-reset codes appear here."
    };

    private View loginRoot;
    private View mainRoot;
    private EditText emailInput;
    private EditText passwordInput;
    private Button loginBtn;
    private TextView loginErr;

    private ImageButton menuBtn;
    private TextView headerAvatar;
    private View dimOverlay;
    private View drawerRoot;
    private LinearLayout[] navItems = new LinearLayout[PAGE_COUNT];
    private ImageView[] navIcons = new ImageView[PAGE_COUNT];
    private View[] navAccents = new View[PAGE_COUNT];
    private TextView[] navLabels = new TextView[PAGE_COUNT];
    private View drawerLogout;

    private ScrollView scroll;
    private LinearLayout list;
    private ProgressBar loading;
    private EditText searchInput;
    private View usersSearchView;

    private int currentPage = PAGE_OVERVIEW;
    private boolean drawerOpen = false;
    private boolean listAnimate = false;

    private final JSONArray[] cache = new JSONArray[PAGE_COUNT];
    private final boolean[] loaded = new boolean[PAGE_COUNT];
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
                load(currentPage, false);
            }
            handler.postDelayed(this, 15000);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setBackgroundColor(color(R.color.bg));
        getWindow().setStatusBarColor(color(R.color.bg));
        getWindow().setNavigationBarColor(color(R.color.bg));

        FrameLayout root = new FrameLayout(this);
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

        menuBtn = (ImageButton) mainRoot.findViewById(R.id.menuBtn);
        headerAvatar = (TextView) mainRoot.findViewById(R.id.headerAvatar);
        dimOverlay = mainRoot.findViewById(R.id.dimOverlay);
        drawerRoot = mainRoot.findViewById(R.id.drawerRoot);
        drawerLogout = mainRoot.findViewById(R.id.drawerLogout);

        scroll = (ScrollView) mainRoot.findViewById(R.id.scroll);
        list = (LinearLayout) mainRoot.findViewById(R.id.list);
        loading = (ProgressBar) mainRoot.findViewById(R.id.loading);

        for (int i = 0; i < PAGE_COUNT; i++) {
            navItems[i] = (LinearLayout) mainRoot.findViewById(NAV_ITEM_IDS[i]);
            navIcons[i] = (ImageView) mainRoot.findViewById(NAV_ICON_IDS[i]);
            navAccents[i] = mainRoot.findViewById(NAV_ACCENT_IDS[i]);
            navLabels[i] = (TextView) mainRoot.findViewById(NAV_LABEL_IDS[i]);
            final int idx = i;
            navItems[i].setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { navigatePage(idx); }
            });
        }
        applyNavState(PAGE_OVERVIEW);

        menuBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) { openDrawer(); }
        });
        dimOverlay.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) { closeDrawer(); }
        });
        drawerLogout.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) { doLogout(); }
        });

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

    /* ---------- shell ---------- */

    private void openDrawer() {
        if (drawerOpen) return;
        drawerOpen = true;
        dimOverlay.setVisibility(View.VISIBLE);
        dimOverlay.setAlpha(0f);
        dimOverlay.animate().alpha(1f).setDuration(220).start();
        drawerRoot.setTranslationX(-dp(288));
        drawerRoot.animate().translationX(0f).setDuration(250)
            .setInterpolator(new android.view.animation.DecelerateInterpolator()).start();
    }

    private void closeDrawer() {
        if (!drawerOpen) return;
        drawerOpen = false;
        dimOverlay.animate().alpha(0f).setDuration(200).withEndAction(new Runnable() {
            @Override
            public void run() { dimOverlay.setVisibility(View.INVISIBLE); }
        }).start();
        drawerRoot.animate().translationX(-dp(288)).setDuration(250)
            .setInterpolator(new android.view.animation.DecelerateInterpolator()).start();
    }

    private void applyNavState(int page) {
        for (int i = 0; i < PAGE_COUNT; i++) {
            boolean active = i == page;
            navItems[i].setBackgroundResource(active ? R.drawable.nav_active_bg : R.drawable.nav_item_bg);
            navIcons[i].setColorFilter(color(active ? R.color.primary : R.color.dim));
            navLabels[i].setTextColor(color(active ? R.color.fg : R.color.dim));
            navAccents[i].setVisibility(active ? View.VISIBLE : View.GONE);
        }
    }

    private void navigatePage(int page) {
        currentPage = page;
        applyNavState(page);
        closeDrawer();
        scroll.fullScroll(View.FOCUS_UP);
        loading.setVisibility(View.VISIBLE);
        if (loaded[page]) {
            render(page, true);
        } else {
            list.removeAllViews();
        }
        load(page, true);
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
                    public void run() { showLogin("Signed out."); }
                });
            }
        }).start();
    }

    private void showLogin(String msg) {
        loginRoot.setAlpha(0f);
        loginRoot.setVisibility(View.VISIBLE);
        mainRoot.setVisibility(View.GONE);
        passwordInput.setText("");
        animateTitle();
        loginRoot.animate().alpha(1f).setDuration(320).start();
        if (msg != null) Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    private void showMain() {
        loginRoot.setVisibility(View.GONE);
        mainRoot.setAlpha(0f);
        mainRoot.setVisibility(View.VISIBLE);
        mainRoot.animate().alpha(1f).setDuration(400).start();
        headerAvatar.setText("A");
        navigatePage(PAGE_OVERVIEW);
        handler.removeCallbacks(autoRefresh);
        handler.postDelayed(autoRefresh, 15000);
    }

    /* ---------- load ---------- */

    private void load(final int page, final boolean animate) {
        if (animate && !loaded[page]) {
            loading.setVisibility(View.VISIBLE);
        }
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    final JSONArray a;
                    switch (page) {
                        case PAGE_USERS: a = Api.users(); break;
                        case PAGE_MESSAGES: a = Api.messages(); break;
                        case PAGE_REVIEWS: a = Api.reviews(); break;
                        case PAGE_LOGINS: a = Api.logins(); break;
                        case PAGE_OTPS: a = Api.otps(); break;
                        default: a = null; break;
                    }
                    final String oldStr = cache[page] == null ? null : cache[page].toString();
                    cache[page] = a;
                    loaded[page] = true;
                    final boolean changed = oldStr == null || !oldStr.equals(a == null ? "" : a.toString());
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            if (currentPage == page && changed) render(page, animate);
                        }
                    });
                } catch (final Api.ApiException e) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            if (e.status == 401) {
                                showLogin("Session expired. Sign in again.");
                            } else if (currentPage == page) {
                                toast(e.getMessage(), true);
                            }
                        }
                    });
                } catch (final Exception e) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            if (currentPage == page && loaded[page]) {
                                toast("Network error", true);
                            }
                        }
                    });
                }
            }
        }).start();
    }

    /* ---------- render ---------- */

    private void render(int page, boolean animate) {
        loading.setVisibility(View.GONE);
        list.removeAllViews();
        listAnimate = animate;
        switch (page) {
            case PAGE_OVERVIEW: renderOverview(); break;
            case PAGE_USERS: renderUsersPage(); break;
            case PAGE_MESSAGES: renderMessagesPage(); break;
            case PAGE_REVIEWS: renderReviewsPage(); break;
            case PAGE_LOGINS: renderLoginsPage(); break;
            default: renderOtpsPage(); break;
        }
        listAnimate = false;
        if (animate && list.getChildCount() > 0) {
            list.setAlpha(0.6f);
            list.setTranslationY(dp(12));
            list.animate().alpha(1f).translationY(0f).setDuration(300)
                .setInterpolator(new android.view.animation.DecelerateInterpolator()).start();
        }
    }

    private void addPageHeader(String title, String desc) {
        View h = getLayoutInflater().inflate(R.layout.page_header, list, false);
        ((TextView) h.findViewById(R.id.pageEyebrow)).setText("ADMIN");
        ((TextView) h.findViewById(R.id.pageTitle)).setText(title);
        ((TextView) h.findViewById(R.id.pageDesc)).setText(desc);
        list.addView(h);
    }

    private void addEmpty(int page, String title, String desc) {
        View e = getLayoutInflater().inflate(R.layout.empty, list, false);
        ImageView icon = (ImageView) e.findViewById(R.id.emptyIcon);
        icon.setImageResource(PAGE_ICONS[page]);
        icon.setColorFilter(color(R.color.dim));
        ((TextView) e.findViewById(R.id.emptyTitle)).setText(title);
        ((TextView) e.findViewById(R.id.emptyDesc)).setText(desc);
        list.addView(e);
    }

    /* --- overview --- */

    private void renderOverview() {
        addPageHeader("Overview", "A live snapshot of the portfolio \u2014 accounts, engagement and security codes.");

        int[] targets = { PAGE_USERS, PAGE_REVIEWS, PAGE_MESSAGES, PAGE_LOGINS, PAGE_OTPS };
        int[] icons = { R.drawable.ic_users, R.drawable.ic_star, R.drawable.ic_mail, R.drawable.ic_history, R.drawable.ic_key_round };
        String[] labels = { "Profiles", "Reviews", "Messages", "Logins", "OTP Codes" };

        LinearLayout row = null;
        for (int i = 0; i < targets.length; i++) {
            if (i % 2 == 0) {
                row = new LinearLayout(this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                rp.topMargin = i == 0 ? dp(14) : dp(10);
                row.setLayoutParams(rp);
                list.addView(row);
            }
            View card = getLayoutInflater().inflate(R.layout.stat_card, row, false);
            LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT);
            cp.weight = 1;
            if (i % 2 == 0) cp.rightMargin = dp(5); else cp.leftMargin = dp(5);
            card.setLayoutParams(cp);
            final int target = targets[i];
            card.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { navigatePage(target); }
            });
            ImageView icon = (ImageView) card.findViewById(R.id.statIcon);
            icon.setImageResource(icons[i]);
            icon.setColorFilter(color(R.color.dim));
            TextView value = (TextView) card.findViewById(R.id.statValue);
            value.setText(loaded[target] ? String.valueOf(cache[target] == null ? 0 : cache[target].length()) : "\u2026");
            ((TextView) card.findViewById(R.id.statLabel)).setText(labels[i]);
            row.addView(card);
        }

        renderRatingsCard();
        renderRecentUsers();
    }

    private void renderRatingsCard() {
        LinearLayout card = sectionCard("Review ratings", "Distribution of viewer ratings (1\u20135 stars).");
        int[] cnt = new int[6];
        JSONArray a = cache[PAGE_REVIEWS];
        int total = 0;
        if (a != null) {
            for (int i = 0; i < a.length(); i++) {
                int r = a.optJSONObject(i) == null ? 0 : a.optJSONObject(i).optInt("rating");
                if (r >= 1 && r <= 5) { cnt[r]++; total++; }
            }
        }
        if (total == 0) {
            TextView none = new TextView(this);
            none.setText("No reviews yet.");
            none.setTextColor(color(R.color.dim));
            none.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
            LinearLayout.LayoutParams nlp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            nlp.topMargin = dp(12);
            none.setLayoutParams(nlp);
            card.addView(none);
        } else {
            LinearLayout bars = new LinearLayout(this);
            bars.setOrientation(LinearLayout.HORIZONTAL);
            bars.setGravity(android.view.Gravity.BOTTOM);
            LinearLayout.LayoutParams blp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(14));
            blp.topMargin = dp(14);
            bars.setLayoutParams(blp);
            LinearLayout legend = new LinearLayout(this);
            legend.setOrientation(LinearLayout.HORIZONTAL);
            legend.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
            for (int n = 5; n >= 1; n--) {
                if (cnt[n] == 0) continue;
                View bar = new View(this);
                bar.setBackgroundResource(R.drawable.rating_bar);
                LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT);
                bp.weight = cnt[n];
                if (n > 1) bp.rightMargin = dp(3);
                bar.setLayoutParams(bp);
                bars.addView(bar);

                TextView l = new TextView(this);
                l.setText(n + "\u2605 " + cnt[n]);
                l.setTextColor(color(R.color.dim));
                l.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT);
                lp.weight = cnt[n];
                lp.topMargin = dp(7);
                l.setLayoutParams(lp);
                legend.addView(l);
            }
            card.addView(bars);
            card.addView(legend);
        }
        list.addView(card);
    }

    private void renderRecentUsers() {
        JSONArray a = cache[PAGE_USERS];
        LinearLayout head = new LinearLayout(this);
        head.setOrientation(LinearLayout.HORIZONTAL);
        head.setGravity(android.view.Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams hlp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        hlp.topMargin = dp(24);
        head.setLayoutParams(hlp);

        TextView t = new TextView(this);
        t.setText("Recently joined");
        t.setTextColor(color(R.color.fg));
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
        t.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        LinearLayout.LayoutParams tlp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT);
        tlp.weight = 1;
        t.setLayoutParams(tlp);
        head.addView(t);

        TextView viewAll = new TextView(this);
        viewAll.setText("VIEW ALL \u2192");
        viewAll.setTextColor(color(R.color.primary));
        viewAll.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        viewAll.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        viewAll.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) { navigatePage(PAGE_USERS); }
        });
        head.addView(viewAll);
        list.addView(head);

        LinearLayout card = sectionCard(null, null);
        if (a == null || a.length() == 0) {
            TextView none = new TextView(this);
            none.setText("No users yet. New signups will appear here.");
            none.setTextColor(color(R.color.dim));
            none.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
            card.addView(none);
        } else {
            List<JSONObject> users = new ArrayList<JSONObject>();
            for (int i = 0; i < a.length(); i++) {
                JSONObject u = a.optJSONObject(i);
                if (u != null) users.add(u);
            }
            Collections.sort(users, new Comparator<JSONObject>() {
                @Override
                public int compare(JSONObject x, JSONObject y) {
                    return y.optString("created_at").compareTo(x.optString("created_at"));
                }
            });
            int max = Math.min(5, users.size());
            for (int i = 0; i < max; i++) {
                if (i > 0) {
                    View div = new View(this);
                    div.setBackgroundColor(color(R.color.line));
                    LinearLayout.LayoutParams dlp = new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, 1);
                    dlp.leftMargin = dp(14);
                    dlp.rightMargin = dp(14);
                    div.setLayoutParams(dlp);
                    card.addView(div);
                }
                addOverviewUser(card, users.get(i));
            }
        }
        list.addView(card);
    }

    private void addOverviewUser(LinearLayout container, JSONObject u) {
        View v = getLayoutInflater().inflate(R.layout.overview_user, container, false);
        TextView av = (TextView) v.findViewById(R.id.ouAvatar);
        avatar(av, u.optString("name"), u.optString("email"));
        ((TextView) v.findViewById(R.id.ouName)).setText(u.optString("name"));
        ((TextView) v.findViewById(R.id.ouEmail)).setText(u.optString("email"));
        ((TextView) v.findViewById(R.id.ouDate)).setText(fmt(u.optString("created_at")));
        boolean banned = u.optBoolean("is_banned");
        v.findViewById(R.id.ouVerified).setVisibility(banned ? View.GONE : View.VISIBLE);
        TextView status = (TextView) v.findViewById(R.id.ouStatus);
        if (banned) {
            status.setText("BANNED");
            status.setTextColor(color(R.color.white));
            status.setBackgroundResource(R.drawable.chip_banned);
        } else {
            status.setText("ACTIVE");
            status.setTextColor(color(R.color.dim));
            status.setBackgroundResource(R.drawable.pill_secondary);
        }
        container.addView(v);
    }

    /* --- users --- */

    private void renderUsersPage() {
        addPageHeader("Registered Profiles",
            countText(cache[PAGE_USERS]) + " total. Manage access, copy identifiers and inspect login history.");
        if (usersSearchView == null) {
            usersSearchView = getLayoutInflater().inflate(R.layout.search_field, list, false);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.topMargin = dp(16);
            usersSearchView.setLayoutParams(lp);
            searchInput = (EditText) usersSearchView.findViewById(R.id.searchInput);
            searchInput.addTextChangedListener(new TextWatcher() {
                @Override
                public void beforeTextChanged(CharSequence s, int a, int b, int c) {}
                @Override
                public void onTextChanged(CharSequence s, int a, int b, int c) {}
                @Override
                public void afterTextChanged(Editable s) {
                    if (currentPage == PAGE_USERS && loaded[PAGE_USERS]) fillUsersRows(false);
                }
            });
        }
        list.addView(usersSearchView);
        fillUsersRows(true);
    }

    private void fillUsersRows(boolean animate) {
        while (list.getChildCount() > 2) {
            list.removeViewAt(list.getChildCount() - 1);
        }
        JSONArray a = cache[PAGE_USERS];
        String q = searchInput == null ? "" : searchInput.getText().toString().trim().toLowerCase(Locale.US);
        if (a == null || a.length() == 0) {
            addEmpty(PAGE_USERS, EMPTY_TITLE[PAGE_USERS], EMPTY_DESC[PAGE_USERS]);
            return;
        }
        List<JSONObject> rows = new ArrayList<JSONObject>();
        for (int i = 0; i < a.length(); i++) {
            JSONObject u = a.optJSONObject(i);
            if (u == null) continue;
            if (q.length() > 0) {
                String name = u.optString("name").toLowerCase(Locale.US);
                String email = u.optString("email").toLowerCase(Locale.US);
                if (!name.contains(q) && !email.contains(q)) continue;
            }
            rows.add(u);
        }
        if (rows.isEmpty()) {
            if (q.length() > 0) {
                addEmpty(PAGE_USERS, "No matching profiles",
                    "Nothing matches \"" + q + "\". Try a different name or email.");
            } else {
                addEmpty(PAGE_USERS, EMPTY_TITLE[PAGE_USERS], EMPTY_DESC[PAGE_USERS]);
            }
            return;
        }
        for (int i = 0; i < rows.size(); i++) {
            addUserRow(rows.get(i), i, animate);
        }
    }

    private void addUserRow(JSONObject u, int i, boolean animate) {
        View v = getLayoutInflater().inflate(R.layout.item_profile, list, false);
        TextView pAvatar = (TextView) v.findViewById(R.id.pAvatar);
        TextView pName = (TextView) v.findViewById(R.id.pName);
        TextView pEmail = (TextView) v.findViewById(R.id.pEmail);
        TextView pRole = (TextView) v.findViewById(R.id.pRole);
        TextView pStatus = (TextView) v.findViewById(R.id.pStatus);
        TextView pDate = (TextView) v.findViewById(R.id.pDate);
        TextView pLogins = (TextView) v.findViewById(R.id.pLogins);
        Button pAction = (Button) v.findViewById(R.id.pAction);
        ImageButton pDelete = (ImageButton) v.findViewById(R.id.pDelete);

        final String id = u.optString("id");
        final String name = u.optString("name");
        final boolean admin = u.optString("role").equals("admin");
        final boolean banned = u.optBoolean("is_banned");

        avatar(pAvatar, name, u.optString("email"));
        pName.setText(name);
        pEmail.setText(u.optString("email"));
        pDate.setText(fmt(u.optString("created_at")));
        v.findViewById(R.id.pVerified).setVisibility(banned ? View.GONE : View.VISIBLE);

        pRole.setBackgroundResource(admin ? R.drawable.chip_admin : R.drawable.chip_user);
        pRole.setTextColor(color(admin ? R.color.white : R.color.dim));
        pRole.setText(admin ? "ADMIN" : opt(u, "role", "user").toUpperCase(Locale.US));

        if (banned) {
            pStatus.setBackgroundResource(R.drawable.chip_banned);
            pStatus.setTextColor(color(R.color.white));
            pStatus.setText("BANNED");
        } else {
            pStatus.setBackgroundResource(R.drawable.pill_secondary);
            pStatus.setTextColor(color(R.color.dim));
            pStatus.setText("ACTIVE");
        }

        int loginCount = u.optInt("login_count");
        pLogins.setText(loginCount + " logins \u25be");
        pLogins.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (expanded.contains(id)) expanded.remove(id); else expanded.add(id);
                fillUsersRows(false);
            }
        });

        if (admin) {
            pStatus.setBackgroundResource(R.drawable.pill_secondary);
            pStatus.setTextColor(color(R.color.dim));
            pStatus.setText("PROTECTED");
            pAction.setVisibility(View.GONE);
            pDelete.setVisibility(View.GONE);
        } else if (banned) {
            pAction.setText("UNBAN");
            pAction.setTextColor(color(R.color.secondary));
            pAction.setBackgroundResource(R.drawable.btn_outline);
            pAction.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { doUnban(u, name); }
            });
            pDelete.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { doDeleteUser(u, name); }
            });
        } else {
            pAction.setText("BAN");
            pAction.setTextColor(color(R.color.danger));
            pAction.setBackgroundResource(R.drawable.btn_ghost);
            pAction.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { doBan(u, name); }
            });
            pDelete.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { doDeleteUser(u, name); }
            });
        }

        if (animate) enterAnim(v, i);
        list.addView(v);

        if (expanded.contains(id)) {
            list.addView(buildLoginExpand(u));
        }
    }

    private View buildLoginExpand(JSONObject u) {
        View v = getLayoutInflater().inflate(R.layout.login_expand, list, false);
        ((TextView) v.findViewById(R.id.leIdValue)).setText(u.optString("id"));
        ((TextView) v.findViewById(R.id.leHashValue)).setText(u.optString("password_hash"));
        ((TextView) v.findViewById(R.id.leJoined)).setText(fmt(u.optString("created_at")));
        ((TextView) v.findViewById(R.id.leLogins)).setText(
            u.optInt("login_count") + " \u00b7 last " + fmt(u.optString("last_login")));
        pIdCopy(v, R.id.leIdCopy, u.optString("id"), "User ID copied.");
        pIdCopy(v, R.id.leHashCopy, u.optString("password_hash"), "Hash copied.");

        JSONArray logins = u.optJSONArray("logins");
        LinearLayout history = (LinearLayout) v.findViewById(R.id.loginHistory);
        ((TextView) v.findViewById(R.id.leHistoryTitle)).setText("LOGIN HISTORY (" + (logins == null ? 0 : logins.length()) + ")");
        if (logins != null) {
            for (int i = 0; i < logins.length(); i++) {
                JSONObject l = logins.optJSONObject(i);
                if (l == null) continue;
                StringBuilder sb = new StringBuilder();
                sb.append("\u25b8 ").append(opt(l, "ip_address", "unknown ip"));
                if (!TextUtils.isEmpty(l.optString("device"))) sb.append(" \u00b7 ").append(l.optString("device"));
                sb.append("\n  ").append(fmt(l.optString("created_at")));
                if (!TextUtils.isEmpty(l.optString("user_agent"))) sb.append("\n  ").append(l.optString("user_agent"));
                TextView line = new TextView(this);
                line.setText(sb.toString());
                line.setTextColor(color(R.color.dim));
                line.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
                line.setTypeface(Typeface.MONOSPACE);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                lp.topMargin = dp(8);
                line.setLayoutParams(lp);
                history.addView(line);
            }
        }
        return v;
    }

    /* --- messages --- */

    private void renderMessagesPage() {
        addPageHeader("Message Inbox",
            countText(cache[PAGE_MESSAGES]) + " from the contact form.");
        JSONArray a = cache[PAGE_MESSAGES];
        if (a == null || a.length() == 0) {
            addEmpty(PAGE_MESSAGES, EMPTY_TITLE[PAGE_MESSAGES], EMPTY_DESC[PAGE_MESSAGES]);
            return;
        }
        for (int i = 0; i < a.length(); i++) {
            final JSONObject m = a.optJSONObject(i);
            if (m == null) continue;
            View v = getLayoutInflater().inflate(R.layout.item_message, list, false);
            ((TextView) v.findViewById(R.id.mName)).setText(m.optString("name").toUpperCase(Locale.US));
            ((TextView) v.findViewById(R.id.mDate)).setText(fmt(m.optString("created_at")));
            ((TextView) v.findViewById(R.id.mEmail)).setText(m.optString("email"));
            ((TextView) v.findViewById(R.id.mText)).setText(m.optString("message"));
            ((ImageButton) v.findViewById(R.id.mDelete)).setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { doDeleteMessage(m); }
            });
            if (listAnimate) enterAnim(v, i);
            list.addView(v);
        }
    }

    /* --- reviews --- */

    private void renderReviewsPage() {
        addPageHeader("Reviews", countText(cache[PAGE_REVIEWS]) + " left by viewers.");
        JSONArray a = cache[PAGE_REVIEWS];
        if (a == null || a.length() == 0) {
            addEmpty(PAGE_REVIEWS, EMPTY_TITLE[PAGE_REVIEWS], EMPTY_DESC[PAGE_REVIEWS]);
            return;
        }
        for (int i = 0; i < a.length(); i++) {
            final JSONObject r = a.optJSONObject(i);
            if (r == null) continue;
            View v = getLayoutInflater().inflate(R.layout.item_review, list, false);
            ((TextView) v.findViewById(R.id.rName)).setText(r.optString("name").toUpperCase(Locale.US));
            v.findViewById(R.id.rVerified).setVisibility(r.optBoolean("is_verified") ? View.VISIBLE : View.GONE);
            ((TextView) v.findViewById(R.id.rDate)).setText(fmt(r.optString("created_at")));
            ((TextView) v.findViewById(R.id.rStars)).setText(stars(r.optInt("rating")));
            ((TextView) v.findViewById(R.id.rText)).setText(r.optString("comment"));
            ((ImageButton) v.findViewById(R.id.rDelete)).setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { doDeleteReview(r); }
            });
            if (listAnimate) enterAnim(v, i);
            list.addView(v);
        }
    }

    /* --- logins --- */

    private void renderLoginsPage() {
        addPageHeader("Login Records", "Real-time sign-in activity across the site.");
        JSONArray a = cache[PAGE_LOGINS];
        if (a == null || a.length() == 0) {
            addEmpty(PAGE_LOGINS, EMPTY_TITLE[PAGE_LOGINS], EMPTY_DESC[PAGE_LOGINS]);
            return;
        }
        for (int i = 0; i < a.length(); i++) {
            final JSONObject l = a.optJSONObject(i);
            if (l == null) continue;
            View v = getLayoutInflater().inflate(R.layout.item_login, list, false);
            ((TextView) v.findViewById(R.id.lEmail)).setText(l.optString("email"));
            String meta = opt(l, "ip_address", "unknown ip");
            if (!TextUtils.isEmpty(l.optString("device"))) meta += " \u00b7 " + l.optString("device");
            ((TextView) v.findViewById(R.id.lMeta)).setText(meta);
            ((TextView) v.findViewById(R.id.lDate)).setText(fmt(l.optString("created_at")));
            TextView ua = (TextView) v.findViewById(R.id.lUa);
            String uas = l.optString("user_agent");
            if (TextUtils.isEmpty(uas)) {
                ua.setVisibility(View.GONE);
            } else {
                ua.setText(uas);
            }
            ((ImageButton) v.findViewById(R.id.lDel)).setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { doDeleteLogin(l); }
            });
            if (listAnimate) enterAnim(v, i);
            list.addView(v);
        }
    }

    /* --- otps --- */

    private void renderOtpsPage() {
        addPageHeader("OTP Codes", "Sign-up and password-reset codes issued in real time.");
        JSONArray a = cache[PAGE_OTPS];
        if (a == null || a.length() == 0) {
            addEmpty(PAGE_OTPS, EMPTY_TITLE[PAGE_OTPS], EMPTY_DESC[PAGE_OTPS]);
            return;
        }
        long now = System.currentTimeMillis();
        for (int i = 0; i < a.length(); i++) {
            final JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            View v = getLayoutInflater().inflate(R.layout.item_otp, list, false);
            ((TextView) v.findViewById(R.id.oEmail)).setText(o.optString("email"));
            ((TextView) v.findViewById(R.id.oPurpose)).setText(opt(o, "purpose", "signup").toUpperCase(Locale.US));
            ((TextView) v.findViewById(R.id.oDate)).setText(fmt(o.optString("created_at")));
            TextView status = (TextView) v.findViewById(R.id.oStatus);
            boolean used = o.optBoolean("used");
            boolean expired = parseMillis(o.optString("expires_at")) < now;
            if (used) {
                status.setText("USED");
                status.setTextColor(color(R.color.primary));
                status.setBackgroundResource(R.drawable.pill_primary);
            } else if (expired) {
                status.setText("EXPIRED");
                status.setTextColor(color(R.color.danger));
                status.setBackgroundResource(R.drawable.pill_danger);
            } else {
                status.setText("ACTIVE");
                status.setTextColor(color(R.color.secondary));
                status.setBackgroundResource(R.drawable.pill_secondary);
            }
            ((TextView) v.findViewById(R.id.oHash)).setText(o.optString("code_hash"));
            ((TextView) v.findViewById(R.id.oMeta)).setText(
                "expires " + fmt(o.optString("expires_at")) + " \u00b7 attempts " + o.optInt("attempts"));
            pIdCopy(v, R.id.oHashCopy, o.optString("code_hash"), "OTP hash copied.");
            ((ImageButton) v.findViewById(R.id.oDel)).setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) { doDeleteOtp(o); }
            });
            if (listAnimate) enterAnim(v, i);
            list.addView(v);
        }
    }

    private String countText(JSONArray a) {
        int n = a == null ? 0 : a.length();
        return n + " account" + (n == 1 ? "" : "s");
    }

    private LinearLayout sectionCard(String title, String desc) {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setBackgroundResource(R.drawable.card_bg);
        int p = dp(16);
        c.setPadding(p, p, p, p);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(10);
        c.setLayoutParams(lp);
        if (title != null) {
            TextView t = new TextView(this);
            t.setText(title);
            t.setTextColor(color(R.color.fg));
            t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
            t.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
            c.addView(t);
        }
        if (desc != null) {
            TextView d = new TextView(this);
            d.setText(desc);
            d.setTextColor(color(R.color.dim));
            d.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
            LinearLayout.LayoutParams dlp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            dlp.topMargin = dp(4);
            d.setLayoutParams(dlp);
            c.addView(d);
        }
        return c;
    }

    private void enterAnim(View v, int i) {
        try {
            v.setStateListAnimator(AnimatorInflater.loadStateListAnimator(this, R.animator.card_touch));
        } catch (Exception ignored) {}
        if (!listAnimate) return;
        v.setAlpha(0f);
        v.setScaleX(0.95f);
        v.setScaleY(0.95f);
        v.setTranslationY(dp(14));
        long delay = Math.min(i, 10) * 28L;
        v.animate().setStartDelay(delay).setDuration(320)
            .alpha(1f).scaleX(1f).scaleY(1f).translationY(0f)
            .setInterpolator(new android.view.animation.OvershootInterpolator(1.05f)).start();
    }

    private void pIdCopy(View v, int id, final String text, final String label) {
        v.findViewById(id).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) { copy(text, label); }
        });
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
                }, PAGE_USERS, name + " banned.");
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
                }, PAGE_USERS, name + " unbanned.");
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
                }, PAGE_USERS, name + " deleted.");
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
                }, PAGE_MESSAGES, "Message deleted.");
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
                }, PAGE_REVIEWS, "Review deleted.");
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
                }, PAGE_LOGINS, "Login record deleted.");
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
                }, PAGE_OTPS, "OTP record deleted.");
            }
        });
    }

    private void mutate(final Op op, final int page, final String doneMsg) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    op.run();
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            toast(doneMsg, false);
                            load(page, true);
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
        tv.setTextColor(color(R.color.white));
        tv.setBackgroundResource(R.drawable.avatar_circle);
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

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(autoRefresh);
        try { unregisterReceiver(installReceiver); } catch (Exception ignored) {}
        super.onDestroy();
    }
}
