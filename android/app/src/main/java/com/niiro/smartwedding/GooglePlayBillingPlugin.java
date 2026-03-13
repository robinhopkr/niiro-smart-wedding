package com.niiro.smartwedding;

import androidx.annotation.NonNull;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesResponseListener;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.Bridge;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "GooglePlayBilling")
public class GooglePlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;

    @Override
    public void load() {
        super.load();
        ensureBillingReady(null, null);
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null) {
            billingClient.endConnection();
            billingClient = null;
        }

        super.handleOnDestroy();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        ensureBillingReady(
            new Runnable() {
                @Override
                public void run() {
                    JSObject result = new JSObject();
                    result.put("available", true);
                    call.resolve(result);
                }
            },
            new ErrorCallback() {
                @Override
                public void onError(String message) {
                    JSObject result = new JSObject();
                    result.put("available", false);
                    result.put("message", message);
                    call.resolve(result);
                }
            }
        );
    }

    @PluginMethod
    public void getProductDetails(PluginCall call) {
        final String productId = call.getString("productId");

        if (productId == null || productId.trim().isEmpty()) {
            call.reject("Es fehlt die Product-ID für Google Play Billing.", "PRODUCT_ID_REQUIRED");
            return;
        }

        ensureBillingReady(
            new Runnable() {
                @Override
                public void run() {
                    queryProductDetails(
                        productId.trim(),
                        new ProductDetailsCallback() {
                            @Override
                            public void onSuccess(ProductDetails productDetails) {
                                JSObject result = new JSObject();
                                result.put("productId", productDetails.getProductId());
                                result.put("title", productDetails.getTitle());
                                result.put("description", productDetails.getDescription());
                                result.put("productType", productDetails.getProductType());
                                call.resolve(result);
                            }

                            @Override
                            public void onError(String message, String code) {
                                call.reject(message, code);
                            }
                        }
                    );
                }
            },
            new ErrorCallback() {
                @Override
                public void onError(String message) {
                    call.reject(message, "BILLING_NOT_AVAILABLE");
                }
            }
        );
    }

    @PluginMethod
    public void queryExistingPurchases(PluginCall call) {
        ensureBillingReady(
            new Runnable() {
                @Override
                public void run() {
                    QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build();

                    billingClient.queryPurchasesAsync(
                        params,
                        new PurchasesResponseListener() {
                            @Override
                            public void onQueryPurchasesResponse(
                                @NonNull BillingResult billingResult,
                                @NonNull List<Purchase> purchases
                            ) {
                                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                                    call.reject(buildBillingMessage(billingResult, "Bestehende Käufe konnten nicht geladen werden."), buildBillingCode(billingResult));
                                    return;
                                }

                                JSArray purchaseArray = new JSArray();
                                String requestedProductId = call.getString("productId");

                                for (Purchase purchase : purchases) {
                                    if (requestedProductId != null && !purchase.getProducts().contains(requestedProductId)) {
                                        continue;
                                    }

                                    purchaseArray.put(mapPurchase(purchase));
                                }

                                JSObject result = new JSObject();
                                result.put("purchases", purchaseArray);
                                call.resolve(result);
                            }
                        }
                    );
                }
            },
            new ErrorCallback() {
                @Override
                public void onError(String message) {
                    call.reject(message, "BILLING_NOT_AVAILABLE");
                }
            }
        );
    }

    @PluginMethod
    public void purchaseCoupleAccess(PluginCall call) {
        final String productId = call.getString("productId");

        if (productId == null || productId.trim().isEmpty()) {
            call.reject("Es fehlt die Product-ID für den Google-Play-Kauf.", "PRODUCT_ID_REQUIRED");
            return;
        }

        if (getActivity() == null) {
            call.reject("Der Google-Play-Kauf benötigt eine aktive Android-Activity.", "ACTIVITY_UNAVAILABLE");
            return;
        }

        if (pendingPurchaseCall != null) {
            call.reject("Es läuft bereits ein anderer Kaufvorgang.", "PURCHASE_ALREADY_IN_PROGRESS");
            return;
        }

        ensureBillingReady(
            new Runnable() {
                @Override
                public void run() {
                    queryProductDetails(
                        productId.trim(),
                        new ProductDetailsCallback() {
                            @Override
                            public void onSuccess(ProductDetails productDetails) {
                                List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
                                productDetailsParamsList.add(
                                    BillingFlowParams.ProductDetailsParams.newBuilder()
                                        .setProductDetails(productDetails)
                                        .build()
                                );

                                BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                                    .setProductDetailsParamsList(productDetailsParamsList)
                                    .build();

                                pendingPurchaseCall = call;
                                pendingPurchaseCall.setKeepAlive(true);
                                Bridge bridge = getBridge();
                                if (bridge != null) {
                                    bridge.saveCall(pendingPurchaseCall);
                                }

                                BillingResult launchResult = billingClient.launchBillingFlow(getActivity(), flowParams);

                                if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                                    rejectPendingPurchaseCall(
                                        buildBillingMessage(launchResult, "Der Kaufdialog konnte nicht geöffnet werden."),
                                        buildBillingCode(launchResult)
                                    );
                                }
                            }

                            @Override
                            public void onError(String message, String code) {
                                call.reject(message, code);
                            }
                        }
                    );
                }
            },
            new ErrorCallback() {
                @Override
                public void onError(String message) {
                    call.reject(message, "BILLING_NOT_AVAILABLE");
                }
            }
        );
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        if (pendingPurchaseCall == null) {
            return;
        }

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            rejectPendingPurchaseCall("Der Google-Play-Kauf wurde abgebrochen.", "USER_CANCELED");
            return;
        }

        if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            rejectPendingPurchaseCall(
                buildBillingMessage(billingResult, "Der Google-Play-Kauf ist fehlgeschlagen."),
                buildBillingCode(billingResult)
            );
            return;
        }

        if (purchases == null || purchases.isEmpty()) {
            rejectPendingPurchaseCall("Google Play hat keinen Kauf zurückgegeben.", "PURCHASE_MISSING");
            return;
        }

        Purchase purchase = purchases.get(0);
        JSObject result = mapPurchase(purchase);
        pendingPurchaseCall.resolve(result);
        releasePendingPurchaseCall();
    }

    private void ensureBillingReady(Runnable onReady, ErrorCallback onError) {
        if (billingClient != null && billingClient.isReady()) {
            if (onReady != null) {
                onReady.run();
            }
            return;
        }

        if (billingClient == null) {
            billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(
                    PendingPurchasesParams.newBuilder()
                        .enableOneTimeProducts()
                        .build()
                )
                .build();
        }

        billingClient.startConnection(
            new BillingClientStateListener() {
                @Override
                public void onBillingServiceDisconnected() {
                    // Google Play will reconnect on the next request.
                }

                @Override
                public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        if (onReady != null) {
                            onReady.run();
                        }
                        return;
                    }

                    if (onError != null) {
                        onError.onError(buildBillingMessage(billingResult, "Google Play Billing ist gerade nicht erreichbar."));
                    }
                }
            }
        );
    }

    private void queryProductDetails(String productId, ProductDetailsCallback callback) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(BillingClient.ProductType.INAPP)
            .build();

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(product))
            .build();

        billingClient.queryProductDetailsAsync(
            params,
            new com.android.billingclient.api.ProductDetailsResponseListener() {
                @Override
                public void onProductDetailsResponse(
                    @NonNull BillingResult billingResult,
                    @NonNull QueryProductDetailsResult queryProductDetailsResult
                ) {
                    List<ProductDetails> productDetailsList = queryProductDetailsResult.getProductDetailsList();

                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        callback.onError(
                            buildBillingMessage(billingResult, "Die Produktdetails konnten nicht geladen werden."),
                            buildBillingCode(billingResult)
                        );
                        return;
                    }

                    if (productDetailsList.isEmpty()) {
                        callback.onError(
                            "Für dieses Produkt wurden in Google Play keine Details gefunden.",
                            "PRODUCT_NOT_FOUND"
                        );
                        return;
                    }

                    callback.onSuccess(productDetailsList.get(0));
                }
            }
        );
    }

    private JSObject mapPurchase(Purchase purchase) {
        JSObject result = new JSObject();
        String productId = purchase.getProducts().isEmpty() ? null : purchase.getProducts().get(0);
        String state = "unknown";

        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
            state = "purchased";
        } else if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
            state = "pending";
        } else if (purchase.getPurchaseState() == Purchase.PurchaseState.UNSPECIFIED_STATE) {
            state = "unspecified";
        }

        result.put("acknowledged", purchase.isAcknowledged());
        result.put("orderId", purchase.getOrderId());
        result.put("packageName", getContext().getPackageName());
        result.put("productId", productId);
        result.put("purchaseState", state);
        result.put("purchaseTime", purchase.getPurchaseTime());
        result.put("purchaseToken", purchase.getPurchaseToken());
        return result;
    }

    private void rejectPendingPurchaseCall(String message, String code) {
        if (pendingPurchaseCall == null) {
            return;
        }

        pendingPurchaseCall.reject(message, code);
        releasePendingPurchaseCall();
    }

    private void releasePendingPurchaseCall() {
        if (pendingPurchaseCall == null) {
            return;
        }

        Bridge bridge = getBridge();
        if (bridge != null) {
            pendingPurchaseCall.release(bridge);
        }
        pendingPurchaseCall = null;
    }

    private String buildBillingMessage(BillingResult result, String fallbackMessage) {
        String debugMessage = result.getDebugMessage();
        if (debugMessage == null || debugMessage.trim().isEmpty()) {
            return fallbackMessage;
        }

        return fallbackMessage + " " + debugMessage;
    }

    private String buildBillingCode(BillingResult result) {
        return String.valueOf(result.getResponseCode());
    }

    private interface ErrorCallback {
        void onError(String message);
    }

    private interface ProductDetailsCallback {
        void onSuccess(ProductDetails productDetails);

        void onError(String message, String code);
    }
}
