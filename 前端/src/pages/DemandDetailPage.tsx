import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Building2, Check } from 'lucide-react';
import { fetchDemand, submitIntent } from '@/lib/services';
import { useFetch } from '@/hooks/useFetch';
import { LoadingState, ErrorState } from '@/components/States';
import { ApiError } from '@/lib/api';

interface ParsedDemandDescription {
  cleanDescription: string;
  source: string | null;
}

function parseDemandDescription(description: string): ParsedDemandDescription {
  const regex = /<!--demand-source:(.*?)-->/s;
  const match = description.match(regex);
  if (!match) {
    return { cleanDescription: description, source: null };
  }
  const source = match[1].trim() || null;
  const cleanDescription = description.replace(regex, '').trim();
  return { cleanDescription, source };
}

function DemandDescriptionCard({ description }: { description: string }) {
  const { cleanDescription, source } = parseDemandDescription(description);
  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)] border border-gray-100/60">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 bg-blue-600 rounded-full" />
        <h3 className="text-[15px] font-bold text-gray-900">需求描述</h3>
      </div>
      <p className="text-[14px] text-gray-600 leading-[1.9] whitespace-pre-line">
        {cleanDescription}
      </p>
      {source && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <span className="text-[12px] text-gray-400">来源：</span>
          <span className="text-[13px] text-gray-600">{source}</span>
        </div>
      )}
    </div>
  );
}

export default function DemandDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    phone: '',
  });

  const { data: demand, loading, error, reload } = useFetch(
    (signal) => fetchDemand(id!, signal),
    [id]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.companyName.trim() || !form.contactName.trim() || !form.phone.trim()) {
      setFormError('请填写公司名称、联系人和联系电话');
      return;
    }

    setSubmitting(true);
    try {
      await submitIntent({
        demand_id: Number(id),
        company_name: form.companyName.trim(),
        contact_person: form.contactName.trim(),
        phone: form.phone.trim(),
      });
      setSubmitted(true);
      setTimeout(() => navigate(-1), 2000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '提交失败，请稍后重试';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex flex-col items-center justify-center px-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <Check size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">提交成功</h2>
        <p className="text-sm text-gray-500 text-center">
          您的信息已提交，需求方将尽快与您联系
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-8">
      {/* 头部 - 桌面端下移至顶部导航栏(64px)之下 */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 fixed-header-desktop-offset">
        <div className="desktop-container">
        <div className="flex items-center px-4 h-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 -ml-2 active:scale-90 transition-transform"
          >
            <ArrowLeft size={20} className="text-gray-900" />
          </button>
          <h1 className="absolute left-0 right-0 text-center text-[15px] font-semibold text-gray-900 pointer-events-none">
            需求详情
          </h1>
        </div>
        </div>
      </div>

      {/* 需求内容 - 桌面端 pt 需加上顶部导航栏高度(64px) */}
      <div className="px-4 pt-[64px] md:pt-[128px] pb-4 space-y-3 desktop-container">
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && !demand && (
          <ErrorState message="未找到该需求" />
        )}

        {!loading && !error && demand && (
          <>
            {/* 需求标题卡片 */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)] border border-gray-100/60">
              <h2 className="text-[17px] font-bold text-gray-900 leading-snug">
                {demand.title}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                  <Building2 size={12} className="text-blue-500" />
                </div>
                <span className="text-[12px] text-gray-500">{demand.company}</span>
              </div>
            </div>

            {/* 详细描述 */}
            <DemandDescriptionCard description={demand.description} />

            {/* 提交表单 */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)] border border-gray-100/60">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 bg-emerald-600 rounded-full" />
                <h3 className="text-[15px] font-bold text-gray-900">提交解决方案</h3>
              </div>
              <p className="text-[12px] text-gray-500 mb-4">
                如果您是AI服务商，对此需求有解决方案，请填写以下信息提交
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    公司名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={form.companyName}
                    onChange={handleChange}
                    placeholder="请输入您的公司名称"
                    className="w-full px-3 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    联系人 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    value={form.contactName}
                    onChange={handleChange}
                    placeholder="请输入联系人姓名"
                    className="w-full px-3 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    联系电话 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="请输入手机号码"
                    className="w-full px-3 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                </div>

                {formError && (
                  <p className="text-[12px] text-red-500">{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-sm font-semibold shadow-md active:scale-[0.98] transition-transform mt-2 disabled:opacity-70 disabled:active:scale-100"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      提交中...
                    </span>
                  ) : (
                    '提交意向'
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
